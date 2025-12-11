export function getAuthorizationToken(): string {
  return import.meta.env.STORYBOOK_BRAINTREE_TOKENIZATION_KEY;
}
