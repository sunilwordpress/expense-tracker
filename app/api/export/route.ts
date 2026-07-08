import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Papa from "papaparse";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { transactions: { orderBy: { date: "desc" }, include: { tags: true } } }
  });

  const transactions = user?.transactions ?? [];

  if (format === "csv") {
    return new NextResponse(Papa.unparse(transactions), {
      headers: {
        "content-type": "text/csv",
        "content-disposition": "attachment; filename=expenseflow.csv"
      }
    });
  }

  return NextResponse.json({ transactions });
}
