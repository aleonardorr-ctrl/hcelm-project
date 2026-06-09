import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        // ✅ Log seguro en consola (pendiente de activar BD cuando cree el modelo AuditLog)
        console.log(`📊 AUDIT: ${method} ${url} | ${responseTime}ms | User: ${request.user?.email || 'anonymous'}`);
      }),
    );
  }
}