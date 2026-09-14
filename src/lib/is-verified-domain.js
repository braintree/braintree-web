const LEGAL_HOSTS = [
  "paypal.com",
  "braintreepayments.com",
  "braintreegateway.com",
  "braintree-api.com",
];

function stripSubdomains(domain) {
  return domain.split(".").slice(-2).join(".");
}

function isVerifiedDomain(url) {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") {
      return false;
    }

    const mainDomain = stripSubdomains(parsed.hostname);

    return LEGAL_HOSTS.includes(mainDomain);
  } catch {
    return false;
  }
}

export default isVerifiedDomain;
