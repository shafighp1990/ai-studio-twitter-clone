type ApiError = { message: string; code?: string };
async function request<T>(
  path: string,
  value?: unknown,
): Promise<{ data: T; error: ApiError | null }> {
  try {
    const r = await fetch(path, {
      method: value === undefined ? "GET" : "POST",
      headers:
        value === undefined ? {} : { "Content-Type": "application/json" },
      body: value === undefined ? undefined : JSON.stringify(value),
    });
    const result = (await r.json()) as { data?: T; error?: ApiError };
    return {
      data: result.data ?? ({} as T),
      error: result.error ?? (!r.ok ? { message: "Request failed" } : null),
    };
  } catch {
    return { data: {} as T, error: { message: "Connection failed" } };
  }
}
type Factor = {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
};
export function createClient() {
  return {
    auth: {
      signInWithPassword: (b: { email: string; password: string }) =>
        request<{ session: boolean }>("/api/auth/login", b),
      signUp: (b: unknown) =>
        request<{ session: boolean }>("/api/auth/register", b),
      signOut: (_b?: unknown) => {
        void _b;
        return request("/api/auth/logout", {});
      },
      refreshSession: () => request("/api/auth/refresh", {}),
      mfa: {
        getAuthenticatorAssuranceLevel: () =>
          request<{ currentLevel: string | null; nextLevel: string | null }>(
            "/api/auth/assurance",
          ),
        listFactors: () =>
          request<{ totp: Factor[]; all: Factor[] }>("/api/auth/factors"),
        enroll: (_b: unknown) => {
          void _b;
          return request<{
            id: string;
            friendly_name: string;
            totp: { qr_code: string; secret: string };
          }>("/api/auth/enroll", {});
        },
        challengeAndVerify: (b: { factorId: string; code: string }) =>
          request("/api/auth/verify", b),
        unenroll: (b: { factorId: string }) => request("/api/auth/unenroll", b),
      },
    },
    from(table: string) {
      let op = "",
        values: unknown;
      const filters: Record<string, unknown> = {};
      const q = {
        insert(v: unknown) {
          op = "insert";
          values = v;
          return q;
        },
        update(v: unknown) {
          op = "update";
          values = v;
          return q;
        },
        delete() {
          op = "delete";
          return q;
        },
        eq(k: string, v: unknown) {
          filters[k] = v;
          return q;
        },
        in(k: string, v: unknown) {
          filters[k] = v;
          return q;
        },
        then<T>(
          resolve: (v: { data: unknown; error: ApiError | null }) => T,
          reject?: (e: unknown) => T,
        ) {
          return request("/api/social", { table, op, values, filters }).then(
            resolve,
            reject,
          );
        },
      };
      return q;
    },
    storage: {
      from(_bucket: string) {
        void _bucket;
        return {
          async upload(path: string, file: File, _options?: unknown) {
            void _options;
            try {
              const r = await fetch("/api/media/" + path, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
              });
              const j = (await r.json()) as { error?: ApiError };
              return { error: j.error ?? null };
            } catch {
              return { error: { message: "Upload failed" } };
            }
          },
          getPublicUrl(path: string) {
            return {
              data: {
                publicUrl: window.location.origin + "/api/media/" + path,
              },
            };
          },
          async remove(paths: string[]) {
            return request("/api/media/delete", { paths });
          },
        };
      },
    },
  };
}
