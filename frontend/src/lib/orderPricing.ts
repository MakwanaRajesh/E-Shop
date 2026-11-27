export const FREE_DELIVERY_THRESHOLD = 999
export const STANDARD_DELIVERY_FEE = 99
export const PLATFORM_FEE = 9

export interface ComputedOrderPricing {
  subtotal: number
  discount: number
  shippingCost: number
  platformFee: number
  totalPayable: number
  isFirstOrderEligible: boolean
  freeDeliveryReason: 'first_order' | 'order_above_999' | null
  amountForFreeDelivery: number
}

export function computeOrderPricing(
  subtotal: number,
  discount: number = 0,
  isFirstOrderEligible: boolean = false,
): ComputedOrderPricing {
  const safeSubTotal = Math.max(0, subtotal)
  const safeDiscount = Math.min(Math.max(0, discount), safeSubTotal)

  let shippingCost = 0
  let freeDeliveryReason: 'first_order' | 'order_above_999' | null = null

  if (safeSubTotal > 0) {
    if (isFirstOrderEligible) {
      shippingCost = 0
      freeDeliveryReason = 'first_order'
    } else if (safeSubTotal >= FREE_DELIVERY_THRESHOLD) {
      shippingCost = 0
      freeDeliveryReason = 'order_above_999'
    } else {
      shippingCost = STANDARD_DELIVERY_FEE
    }
  }

  const platformFee = safeSubTotal > 0 ? PLATFORM_FEE : 0
  const totalPayable = Math.max(0, safeSubTotal - safeDiscount + shippingCost + platformFee)
  const amountForFreeDelivery =
    !isFirstOrderEligible && safeSubTotal > 0 && safeSubTotal < FREE_DELIVERY_THRESHOLD
      ? Math.max(0, Math.ceil(FREE_DELIVERY_THRESHOLD - safeSubTotal))
      : 0

  return {
    subtotal: safeSubTotal,
    discount: safeDiscount,
    shippingCost,
    platformFee,
    totalPayable,
    isFirstOrderEligible,
    freeDeliveryReason,
    amountForFreeDelivery,
  }
}
