import { GraphQLError, Kind } from "graphql";
import type {
  ASTVisitor,
  OperationDefinitionNode,
  SelectionSetNode,
  ValidationContext,
} from "graphql";

// GraphQL's shape makes a small query into a large one for free: Client ->
// invoices -> client -> invoices -> ... nests as deep as the caller likes, and
// each level multiplies the work the server does. Without a bound, one short
// request can pin the database — a DoS with no authentication weakness behind
// it. This rule rejects over-deep documents at VALIDATION time, before a single
// resolver (and therefore a single query) runs.
//
// Fragments are resolved as they're encountered, because otherwise depth could
// simply be hidden behind a spread. A visited-set breaks fragment cycles (which
// are independently illegal, but this rule must not hang on one).
export function depthLimit(maxDepth: number) {
  return (context: ValidationContext): ASTVisitor => ({
    OperationDefinition(operation: OperationDefinitionNode) {
      const depth = selectionSetDepth(operation.selectionSet, context, new Set());
      if (depth > maxDepth) {
        context.reportError(
          new GraphQLError(
            `Query is too deep: depth ${depth} exceeds the maximum of ${maxDepth}.`,
            { nodes: [operation] },
          ),
        );
      }
    },
  });
}

function selectionSetDepth(
  selectionSet: SelectionSetNode,
  context: ValidationContext,
  visitedFragments: Set<string>,
): number {
  let deepest = 0;

  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      // Introspection meta-fields don't hit resolvers/DB; not worth counting.
      if (selection.name.value.startsWith("__")) continue;
      const childDepth = selection.selectionSet
        ? 1 + selectionSetDepth(selection.selectionSet, context, visitedFragments)
        : 1;
      deepest = Math.max(deepest, childDepth);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      // An inline fragment is not itself a level of nesting.
      deepest = Math.max(deepest, selectionSetDepth(selection.selectionSet, context, visitedFragments));
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const name = selection.name.value;
      if (visitedFragments.has(name)) continue;
      const fragment = context.getFragment(name);
      if (!fragment) continue;
      visitedFragments.add(name);
      deepest = Math.max(deepest, selectionSetDepth(fragment.selectionSet, context, visitedFragments));
      visitedFragments.delete(name);
    }
  }

  return deepest;
}
