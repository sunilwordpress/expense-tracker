"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validation";

export async function createTransaction(input: unknown) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { ok: false, error: "Sign in to sync transactions to the cloud." };
  }

  const data = transactionSchema.parse(input);
  const user = await prisma.user.upsert({
    where: { email: session.user.email },
    update: {},
    create: {
      email: session.user.email,
      name: session.user.name,
      image: session.user.image
    }
  });

  const transaction = await prisma.transaction.create({
    data: {
      ...data,
      userId: user.id,
      tags: {
        connectOrCreate: data.tags.map((name) => ({
          where: { userId_name: { userId: user.id, name } },
          create: { userId: user.id, name }
        }))
      }
    }
  });

  revalidatePath("/");
  return { ok: true, transaction };
}
