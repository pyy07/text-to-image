import { prisma } from '@/lib/prisma'

export interface CreateAuditLogParams {
  userId?: string
  actorId?: string
  action: string
  targetType?: string
  targetId?: string
  details?: string
}

export async function createAuditLog(params: CreateAuditLogParams) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      actorId: params.actorId ?? null,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      details: params.details ?? null,
    },
  })
}
