# Hackathon Template

Starter template con Next.js 16, Tailwind CSS 4, Prisma 7, Neon PostgreSQL y Better Auth.

Incluye:

- Login con email y password
- Sign up con email y password
- Login con Google OAuth
- Dashboard protegido con validación de sesión en el servidor
- Prisma schema mínimo con solo `User`, `Session`, `Account` y `Verification`

## Stack

- Next.js App Router
- Tailwind CSS
- Prisma + `@prisma/adapter-pg`
- Neon PostgreSQL serverless
- Better Auth + Prisma adapter

## Variables de entorno

Crea tu archivo `.env` a partir de `.env.example`.

```env
DATABASE_URL="postgresql://user:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="replace-this-with-a-random-secret-at-least-32-characters-long"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

## Neon

1. Crea una base de datos en Neon.
2. Copia la connection string de PostgreSQL con SSL.
3. Ponla en `DATABASE_URL`.

## Google OAuth

1. Crea un OAuth Client en Google Cloud Console.
2. Añade este redirect URI para local:

```text
http://localhost:3000/api/auth/callback/google
```

3. Guarda `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`.

## Instalación

```bash
npm install
```

## Prisma

Genera el cliente:

```bash
npm run prisma:generate
```

Crea la migración inicial y aplica el schema a Neon:

```bash
npm run prisma:migrate -- --name init
```

Abre Prisma Studio si quieres inspeccionar los datos:

```bash
npm run prisma:studio
```

## Desarrollo

```bash
npm run dev
```

## Estructura importante

- `prisma/schema.prisma`: schema mínimo de Better Auth
- `src/lib/prisma.ts`: cliente Prisma para Neon/Postgres
- `src/lib/auth.ts`: configuración server de Better Auth
- `src/lib/auth-client.ts`: cliente React para sign in / sign up / sign out
- `src/app/api/auth/[...all]/route.ts`: handler de Better Auth
- `src/app/sign-in/page.tsx`: login con email y Google
- `src/app/sign-up/page.tsx`: registro con email y Google
- `src/app/dashboard/page.tsx`: ruta protegida

## Notas

- El botón de Google requiere que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén configurados.
- `BETTER_AUTH_SECRET` debe reemplazarse antes de usar el proyecto fuera de desarrollo local.
- El template evita tablas extra para mantener el dominio inicial lo más simple posible.
