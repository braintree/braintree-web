interface ImportMetaEnv {
  readonly VITE_YOUR_URL: string;
  readonly VITE_REALM: string;
  readonly VITE_CLIENT_ID: string;
  readonly STORYBOOK_BRAINTREE_TOKENIZATION_KEY: string;
  readonly STORYBOOK_BRAINTREE_CLIENT_TOKEN: string;
  readonly STORYBOOK_BRAINTREE_PUBLIC_KEY: string;
  readonly STORYBOOK_BRAINTREE_PRIVATE_KEY: string;
  readonly STORYBOOK_BRAINTREE_CUSTOMER_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
