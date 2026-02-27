import prisma from './prisma.util';

/**
 * Returns the sum of all prediction bets a user has placed on OPEN predictions.
 * This money is "reserved" — it has NOT been deducted from their actual balance yet,
 * but it is committed and will be deducted if they lose when the prediction resolves.
 */
export async function getReservedBalance(userId: string): Promise<number> {
  const result = await prisma.predictionBet.aggregate({
    where: {
      userId,
      prediction: { status: 'OPEN' },
    },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

/**
 * Returns the user's available balance = actual balance - reserved balance.
 * This is the amount the user can actually spend on other games right now.
 */
export async function getAvailableBalance(userId: string): Promise<number> {
  const [user, reserved] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { balance: true } }),
    getReservedBalance(userId),
  ]);
  return (user?.balance ?? 0) - reserved;
}
