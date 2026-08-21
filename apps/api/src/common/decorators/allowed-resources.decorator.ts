import { SetMetadata } from '@nestjs/common';

export const ALLOWED_RESOURCES_KEY = 'allowed_resources';
export const AllowedResources = (...resources: string[]) => SetMetadata(ALLOWED_RESOURCES_KEY, resources);