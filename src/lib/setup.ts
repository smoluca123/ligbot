// Unless explicitly defined, set NODE_ENV as development:
process.env.NODE_ENV ??= 'development';

import { ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
import { setup } from '@skyra/env-utilities';
import * as colorette from 'colorette';
import { join } from 'node:path';
import { rootDir } from './constants';
import { prisma } from './prisma';

// Set default behavior to bulk overwrite
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

// Read env var
setup({ path: join(rootDir, '.env') });

// Enable colorette
colorette.createColors({ useColor: true });

// Initialize Prisma connection
prisma.$connect().catch((error: any) => {
	console.error('Failed to connect to database:', error);
	process.exit(1);
});
