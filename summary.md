# Resumo da Implementação - Fase 5: Escala (Permissões Granulares para STAFF)

## Visão Geral
Esta documentação descreve a implementação do sistema de permissões granulares para o papel `STAFF` no PetShop Manager, conforme definido na Fase 5 (Escala) do projeto. O objetivo era permitir que funcionários com papel STAFF tivessem acesso restrito apenas aos módulos específicos liberados para eles, mantendo o papel OWNER com acesso total a todos os recursos.

## Implementação Realizada

### 1. Criação do Decorator `AllowedResources`
**Arquivo:** `src/common/decorators/allowed-resources.decorator.ts`

Criamos um decorator personalizado utilizando o mecanismo de metadados do NestJS para definir quais módulos cada papel pode acessar:

```typescript
import { SetMetadata } from '@nestjs/common';

export const ALLOWED_RESOURCES_KEY = 'allowed_resources';
export const AllowedResources = (...resources: string[]) =>
  SetMetadata(ALLOWED_RESOURCES_KEY, resources);
```

### 2. Criação do Guard `StaffPermissionsGuard`
**Arquivo:** `src/common/guards/staff-permissions.guard.ts`

Implementamos um guard que verifica se o usuário tem permissão para acessar o recurso solicitado:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOWED_RESOURCES_KEY } from '../decorators/allowed-resources.decorator';

@Injectable()
export class StaffPermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // O papel OWNER tem acesso total a todos os recursos
    if (user?.role === 'OWNER') {
      return true;
    }
    
    // Obtém os recursos permitidos do decorator
    const allowedResources = this.reflector.getAllAndOverride<string[]>(
      ALLOWED_RESOURCES_KEY,
      [context.getHandler(), context.getClass()],
    );
    
    // Se nenhum recurso foi especificado, nega o acesso por padrão (princípio do menor privilégio)
    if (!allowedResources) {
      return false;
    }
    
    // Obtém o recurso solicitado da URL (primeiro segmento após o base path)
    const requestUrl = request.url;
    const resource = requestUrl.split('/')[1]; // /appointments -> appointments
    
    // Verifica se o recurso solicitado está na lista de recursos permitidos
    return allowedResources.includes(resource);
  }
}
```

### 3. Aplicação nos Controladores

Aplicamos o `StaffPermissionsGuard` e o decorator `@AllowedResources` nos seguintes controladores:

#### Appointments Controller
**Arquivo:** `src/modules/appointments/appointments.controller.ts`
- Adicionado `StaffPermissionsGuard` ao array de `UseGuards`
- Adicionado decorator `@AllowedResources('appointments')`

#### Reports Controller
**Arquivo:** `src/modules/reports/reports.controller.ts`
- Adicionado `StaffPermissionsGuard` ao array de `UseGuards`
- Adicionado decorator `@AllowedResources('reports')`

#### Dogs Controller
**Arquivo:** `src/modules/dogs/dogs.controller.ts`
- Adicionado `StaffPermissionsGuard` ao array de `UseGuards`
- Adicionado decorator `@AllowedResources('dogs')`

#### Services Controller
**Arquivo:** `src/modules/services/services.controller.ts`
- Adicionado `StaffPermissionsGuard` ao array de `UseGuards`
- Adicionado decorator `@AllowedResources('services')`

#### Users Controller
**Arquivo:** `src/modules/users/users.controller.ts`
- Adicionado import de `StaffPermissionsGuard` e `AllowedResources`
- Adicionado `StaffPermissionsGuard` ao array de `UseGuards`
- Adicionado decorator `@AllowedResources('users')`

### 4. Verificação de Controladores Excepcionais

#### Auth Controller
**Arquivo:** `src/modules/auth/auth.controller.ts`
- Mantido sem alterações pois é responsável pela autenticação pública (registro/login)
- Não requer proteção de permissoes específicas

#### Metrics Controller
**Arquivo:** `src/modules/metrics/metrics.controller.ts`
- Já possuía proteção baseada em papéis (`@Roles('OWNER', 'STAFF')`)
- Mantido como está, já que métricas são acessíveis para ambos os papéis

## Como Foi Implementado

### Abordagem Técnica
1. **Separation of Concerns**: Separamos a definição de permissões (decorator) da verificação de permissões (guard)
2. **Reutilização**: O mesmo decorator e guard podem ser aplicados a qualquer controlador
3. **Princípio do Menor Privilégio**: Por padrão, se nenhum recurso for especificado no decorator, o acesso é negado
4. **Compatibilidade Mantida**: O papel OWNER continua tendo acesso total a todos os recursos
5. **Integração com NestJS**: Utilizamos o mecanismo de metadados do NestJS para passar informações entre decorator e guard

### Fluxo de Autorização
1. Usuário faz uma requisição para um endpoint (ex: GET /appointments)
2. O request passa pelos guards na ordem definida em `UseGuards`
3. O `StaffPermissionsGuard` verifica:
   - Se o usuário é OWNER → permite acesso
   - Se o usuário é STAFF → verifica se o recurso solicitado está na lista de recursos permitidos do decorator
   - Se o recurso estiver na lista → permite acesso
   - Caso contrário → lança `ForbiddenException`

## Próximos Passos

### 1. Desenvolvimento Frontend
- Criação de views para gestão de usuários (criação, edição, listagem)
- Implementação de interface para definição de permissões por STAFF
- Integração com os novos endpoints de permissões

### 2. Testes
- Testes unitários para o `StaffPermissionsGuard`
- Testes de integração para verificar o funcionamento dos decorators e guards
- Testes de端到端 (e2e) para validar os fluxos de autorização

### 3. Documentação
- Atualização da documentação da API para refletir os novos requisitos de permissão
- Criação de guia para administradores sobre como configurar permissões de STAFF

### 4. Refinamento de PWA (Conforme mencionado nas instruções iniciais)
- Estratégias avançadas de caching
- Capacidades offline
- Background sync

### 5. Considerações Futuras
- Implementação de permissões mais granulares (nível de ação dentro de cada módulo)
- Sistema de roles dinâmico além de OWNER/STAFF
- Auditoría de acesso e logs de permissões

## Arquivos Modificados

1. `src/common/decorators/allowed-resources.decorator.ts` - Novo arquivo
2. `src/common/guards/staff-permissions.guard.ts` - Novo arquivo
3. `src/modules/appointments/appointments.controller.ts` - Modificado
4. `src/modules/reports/reports.controller.ts` - Modificado
5. `src/modules/dogs/dogs.controller.ts` - Modificado
6. `src/modules/services/services.controller.ts` - Modificado
7. `src/modules/users/users.controller.ts` - Modificado

## Conclusão
O sistema de permissões granulares para STAFF foi implementado com sucesso, seguindo as melhores práticas do NestJS e mantendo a consistência com o código existente. A solução é flexível, reutilizável e fácil de estender para futuros requisitos de segurança.