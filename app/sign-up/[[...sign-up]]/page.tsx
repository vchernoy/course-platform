import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <SignUp routing="path" path="/sign-up" />
    </main>
  );
}
