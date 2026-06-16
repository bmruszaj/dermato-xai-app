export function proxy() {
  return new Response("pong", { status: 200 });
}

export const config = {
  matcher: ["/ping"],
};
