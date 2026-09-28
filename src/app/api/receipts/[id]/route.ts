import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { validateReceipt, cancelReceipt } from '@/lib/inventory-engine'
import { AuditAction } from '@prisma/client'

async function requireAuth() {
  const session = await getSession()
  if (!session) {
    return { error: NextResponse.json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }), session: null }
  }
  return { error: null, session }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id } = await params

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: true,
        location: true,
        createdBy: { select: { id: true, name: true, email: true } },
        validatedBy: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true, reorderLevel: true } } },
        },
      },
    })

    if (!receipt) {
      return NextResponse.json(
        { success: false, message: 'Receipt not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: receipt })
  } catch (error) {
    console.error('Get receipt error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const body = await request.json()

    const receipt = await prisma.receipt.findUnique({ where: { id } })
    if (!receipt) {
      return NextResponse.json(
        { success: false, message: 'Receipt not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (receipt.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, message: 'Can only edit draft receipts', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    const updated = await prisma.receipt.update({
      where: { id },
      data: {
        supplierId: body.supplierId,
        warehouseId: body.warehouseId,
        locationId: body.locationId,
        date: body.date ? new Date(body.date) : undefined,
        notes: body.notes,
        items: body.items ? {
          deleteMany: {},
          create: body.items.map((item: { productId: string; quantity: number; unit: string }) => ({
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        } : undefined,
      },
      include: { items: { include: { product: true } } },
    })

    // Audit log - using CREATE_RECEIPT as closest match
    await prisma.auditLog.create({
      data: {
        userId: auth.session!.userId,
        action: 'CREATE_RECEIPT',
        entity: 'Receipt',
        entityId: id,
        before: receipt,
        after: updated,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Receipt updated successfully',
      data: updated,
    })
  } catch (error) {
    console.error('Update receipt error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  // Only managers can delete
  if (auth.session!.role !== 'INVENTORY_MANAGER') {
    return NextResponse.json(
      { success: false, message: 'Forbidden', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params
    const receipt = await prisma.receipt.findUnique({ where: { id } })
    if (!receipt) {
      return NextResponse.json(
        { success: false, message: 'Receipt not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (receipt.status === 'DONE') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete completed receipt', code: 'ALREADY_DONE' },
        { status: 400 }
      )
    }

    await prisma.receipt.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.userId,
        action: 'CANCEL_RECEIPT',
        entity: 'Receipt',
        entityId: id,
        before: receipt,
      },
    })

    return NextResponse.json({ success: true, message: 'Receipt deleted successfully' })
  } catch (error) {
    console.error('Delete receipt error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}