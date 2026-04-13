import { NextResponse } from "next/server";

import { analyzeDomain } from "@/lib/email-auth";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

type AnalyzeDomainRequest = {
  domain?: string;
  dkimSelector?: string;
};

export async function POST(request: Request) {
  let body: AnalyzeDomainRequest;

  try {
    body = (await request.json()) as AnalyzeDomainRequest;
  } catch {
    return NextResponse.json(
      {
        error: "The request body must be valid JSON.",
      },
      { status: 400 },
    );
  }

  if (typeof body.domain !== "string") {
    return NextResponse.json(
      {
        error: "A domain string is required.",
      },
      { status: 400 },
    );
  }

  if (
    typeof body.dkimSelector !== "undefined" &&
    typeof body.dkimSelector !== "string"
  ) {
    return NextResponse.json(
      {
        error: "If provided, the DKIM selector must be a string.",
      },
      { status: 400 },
    );
  }

  try {
    const analysis = await analyzeDomain(body.domain, body.dkimSelector);
    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected error while analyzing the domain.",
      },
      { status: 500 },
    );
  }
}
