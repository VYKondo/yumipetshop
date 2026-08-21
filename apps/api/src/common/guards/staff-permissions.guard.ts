import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOWED_RESOURCES_KEY } from '../../decorators/allowed-resources.decorator';
import { UserRole } from '../../auth/dto/auth.dto';

@Injectable()
export class StaffPermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the allowed resources from the decorator
    const allowedResources = this.reflector.getAllAndOverride<string[]>(
      ALLOWED_RESOURCES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no resources are specified, allow access (or you could decide to deny by default)
    if (!allowedResources || allowedResources.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // OWNER has access to everything
    if (user.role === UserRole.OWNER) {
      return true;
    }

    // For STAFF, check if the requested resource is in the allowed list
    // We need to determine the resource from the context.
    // For simplicity, we'll assume the resource is the controller name (module name)
    // In a real application, you might want to derive this from the route or a parameter.
    const controller = context.getClass();
    const resource = controller.name.toLowerCase().replace('controller', '');

    // Check if the resource is in the allowed resources list
    const hasPermission = allowedResources.some(resourceName =>
      resource.includes(resourceName.toLowerCase()) ||
      resourceName.toLowerCase().includes(resource)
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Acesso negado ao recurso: ${resource}. Recursos permitidos: ${allowedResources.join(', ')}`,
      );
    }

    return true;
  }
}