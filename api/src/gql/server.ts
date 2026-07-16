import type { Request } from "express";
import { GraphQLError, NoSchemaIntrospectionCustomRule, type ValidationRule } from "graphql";
import { createSchema, createYoga, renderGraphiQL, type Plugin } from "graphql-yoga";

import { env } from "@/config/env.js";
import { AppError } from "@/lib/errors.js";
import { buildContext, type GraphQLContext } from "@/gql/context.js";
import { depthLimit } from "@/gql/depthLimit.js";
import { resolvers } from "@/gql/resolvers.js";
import { typeDefs } from "@/gql/schema.js";

const MAX_QUERY_DEPTH = 8;
const GRAPHIQL_TITLE = "Kontora GraphQL";

// yoga's built-in renderGraphiQL substitutes the page title with
// String.prototype.replace(string, ...), which replaces only the FIRST match —
// but the HTML template carries __TITLE__ twice (the <title> tag and the
// pre-hydration "Loading __TITLE__..." fallback div). The result is a page
// stuck showing the literal "Loading __TITLE__...". Finish the substitution
// with a global replace so no placeholder can leak into the rendered page.
function renderGraphiQLWithTitle(opts: Parameters<typeof renderGraphiQL>[0]): string {
  return renderGraphiQL({ ...opts, title: GRAPHIQL_TITLE }).replaceAll("__TITLE__", GRAPHIQL_TITLE);
}

// The context Yoga hands resolvers is our GraphQLContext plus the Node `req`
// that Yoga threads through as the "server context". Naming it once here keeps
// createSchema and createYoga agreeing on the same shape.
type YogaServerContext = { req: Request };

const schema = createSchema<YogaServerContext & GraphQLContext>({ typeDefs, resolvers });

// Yoga plugins are envelop plugins; onValidate lets us bolt extra rules onto
// the standard validation pass, which is the right place for both of these —
// they reject a bad document before any resolver runs.
function useValidationRules(rules: ValidationRule[]): Plugin {
  return {
    onValidate({ addValidationRule }) {
      for (const rule of rules) addValidationRule(rule);
    },
  };
}

const validationRules: ValidationRule[] = [depthLimit(MAX_QUERY_DEPTH)];

// Introspection is a development convenience and a production information
// leak: it hands an attacker the full type graph, including fields they'd
// otherwise have to guess. Off in production; on locally, where GraphiQL needs
// it. NoSchemaIntrospectionCustomRule ships with graphql-js and is the
// canonical way to do this — no extra dependency.
const isProduction = env.NODE_ENV === "production";
if (isProduction) {
  validationRules.push(NoSchemaIntrospectionCustomRule);
}

export const yoga = createYoga<YogaServerContext, GraphQLContext>({
  schema,
  graphqlEndpoint: "/graphql",
  // GraphiQL (and Yoga's landing page) are dev-only for the same reason.
  graphiql: !isProduction,
  renderGraphiQL: renderGraphiQLWithTitle,
  landingPage: false,
  plugins: [useValidationRules(validationRules)],
  context: ({ req }) => buildContext(req),
  // Batching multiplies one HTTP request into N operations, which sidesteps
  // per-request rate limiting. Not needed here, so not enabled.
  batching: false,
  cors: false, // the app-level cors() middleware already governs this origin
  maskedErrors: {
    // Deliberate errors (ForbiddenError, NotFoundError, ...) carry messages
    // written for users and should survive. Anything else — a Prisma failure, a
    // bug — is masked to a generic message so stack traces, SQL, and schema
    // internals never reach the client.
    maskError(error, message) {
      const original = (error as { originalError?: unknown })?.originalError ?? error;
      if (original instanceof AppError) {
        return new GraphQLError(original.message, {
          extensions: { code: original.code, http: { status: original.statusCode } },
        });
      }
      console.error("GraphQL unexpected error:", error);
      return new GraphQLError(message);
    },
  },
});
