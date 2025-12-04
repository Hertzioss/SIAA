
import { LoginForm } from "@/components/login-form";
import { getStrapiData } from "@/lib/strapi";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  )
  // const data = await getStrapiData('/home-page');

  // console.log(data);

  // const { title, description } = data.data;

  // const cookieStore = await cookies();

  // const session = await getSession({
  //   req: {
  //     headers: cookieStore.getAll().reduce((headers, cookie) => {
  //       headers[cookie.name] = cookie.value;
  //       return headers;
  //     }, {} as Record<string, string>),
  //   },
  // });

  // if (session) {
  //   redirect('/dashboard');
  // }
}
