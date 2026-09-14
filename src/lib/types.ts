export type ModuleCreateOptions = {
  client?: unknown;
  authorization?: string;
};

export type RiskCorrelationOptions = {
  riskCorrelationId?: string;
};

export type TokenizationComponent<TokenizeOptions, TokenizeResult> = {
  tokenize(options?: TokenizeOptions): Promise<TokenizeResult>;
  teardown(): Promise<void>;
};
