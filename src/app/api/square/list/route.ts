import { NextResponse } from "next/server";

export async function GET() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  
  const response = await fetch("https://connect.squareup.com/v2/catalog/list?types=ITEM", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Square-Version": "2024-01-18",
    },
  });

  const data = await response.json();
  return NextResponse.json(data);
}
