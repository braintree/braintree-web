import { CardholderNameInput } from "./cardholder-name-input";
import { CreditCardInput } from "./credit-card-input";
import { ExpirationDateInput } from "./expiration-date-input";
import { ExpirationMonthInput } from "./expiration-month-input";
import { ExpirationYearInput } from "./expiration-year-input";
import { CVVInput } from "./cvv-input";
import { PostalCodeInput } from "./postal-code-input";

export const cardholderName = CardholderNameInput;
export const number = CreditCardInput;
export const expirationDate = ExpirationDateInput;
export const expirationMonth = ExpirationMonthInput;
export const expirationYear = ExpirationYearInput;
export const cvv = CVVInput;
export const postalCode = PostalCodeInput;

export default {
  cardholderName: CardholderNameInput,
  number: CreditCardInput,
  expirationDate: ExpirationDateInput,
  expirationMonth: ExpirationMonthInput,
  expirationYear: ExpirationYearInput,
  cvv: CVVInput,
  postalCode: PostalCodeInput,
};
