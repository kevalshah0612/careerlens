import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { initializeDatabase, prisma } from './config/database';
import { redis } from './config/redis';
import { z } from 'zod';
import * as jobService from './services/job.service';
import { Jobs } from 'openai/resources/fine-tuning/jobs/jobs';

const app = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'warn',
  },
});

// Register CORS
app.register(cors, {
  origin: true,
});

// Health check
app.get('/health', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: String(error) };
  }
});

// Tenant middleware
app.addHook('preHandler', async (request, reply) => {
  // Skip middleware for health check
  if (request.url === '/health') {
    return;
  }

  const tenantId = request.headers['x-tenant-id'] as string;
  
  if (!tenantId) {
    return reply.code(401).send({ error: 'Missing X-Tenant-ID header' });
  }

  // Validate tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return reply.code(404).send({ error: 'Tenant not found' });
  }

  (request as any).tenant = tenant;
});

// GET /api/v1/jobs - List jobs with pagination and filters
const JobsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(20),
  location: z.string().optional(),
  experienceLevel: z.string().optional(),
  remote: z.coerce.boolean().optional(),
  company: z.string().optional(),
  skills: z.string().optional(), // Comma-separated
  minDate: z.string().optional(),
  source: z.string().optional(),
});

app.get('/api/v1/jobs', async (request, reply) => {
  try {
    const query = JobsQuerySchema.parse(request.query);
    const tenant = (request as any).tenant;

const filters: any = {
      location: query.location,
      experienceLevel: query.experienceLevel,
      remote: query.remote,
      company: query.company,
      skills: query.skills ? query.skills.split(',') : undefined,
      minDate: query.minDate ? new Date(query.minDate) : undefined,
      source: query.source,
    };

    const result = await jobService.getJobs(
      tenant.id,
      query.page,
      query.limit,
      filters
    );

    return result;
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch jobs' });
  }
});

// POST /api/v1/jobs/search - Semantic search
const SearchBodySchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(50).default(20),
  filters: z.object({
    location: z.string().optional(),
    experienceLevel: z.string().optional(),
    remote: z.boolean().optional(),
    company: z.string().optional(),
  }).optional(),
});

app.post('/api/v1/jobs/search', async (request, reply) => {
  try {
    const body = SearchBodySchema.parse(request.body);
    const tenant = (request as any).tenant;

    const result = await jobService.semanticSearch(
      tenant.id,
      body.query,
      body.limit,
      body.filters
    );

    return result;
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Search failed' });
  }
});

// GET /api/v1/jobs/:id - Get single job
app.get('/api/v1/jobs/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const tenant = (request as any).tenant;

    const job = await jobService.getJobById(tenant.id, id);

    if (!job) {
      return reply.code(404).send({ error: 'Job not found' });
    }

    return job;
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch job' });
  }
});

// GET /api/v1/stats - Dashboard statistics
app.get('/api/v1/stats', async (request, reply) => {
  try {
    const tenant = (request as any).tenant;
    const stats = await jobService.getStats(tenant.id);
    return stats;
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch stats' });
  }
});

// GET /api/v1/tenants - List all tenants (admin)
app.get('/api/v1/tenants', async (request, reply) => {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
        createdAt: true,
      },
    });
    return { tenants };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch tenants' });
  }
});

// POST /api/v1/tenants - Create tenant (admin)
const CreateTenantSchema = z.object({
  name: z.string().min(1),
  subdomain: z.string().min(1).regex(/^[a-z0-9-]+$/),
  config: z.record(z.any()).optional(),
});

app.post('/api/v1/tenants', async (request, reply) => {
  try {
    const body = CreateTenantSchema.parse(request.body);

    const tenant = await prisma.tenant.create({
      data: {
        name: body.name,
        subdomain: body.subdomain,
        config: body.config || {},
      },
    });

    return tenant;
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to create tenant' });
  }
});

// Start server
async function start() {
  try {
    await initializeDatabase();
    
    await app.listen({ 
      port: config.port,
      host: '0.0.0.0',
    });

    console.log(`\n Server running on http://localhost:${config.port}`);
    console.log(` Health check: http://localhost:${config.port}/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await app.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

start();
