export default function EnvDebug() {
  return (
    <pre>
      {JSON.stringify(
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "missing",
        },
        null,
        2
      )}
    </pre>
  );
}
