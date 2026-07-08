import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const subscription = await request.json();
  return NextResponse.json({
    ok: true,
    subscription,
    message: "Subscription received. Configure a Web Push provider before production sends."
  });
}
