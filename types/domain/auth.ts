export interface SignupInput {
  email: string;
  password: string;
  displayName: string;
}

export interface SignupResult {
  status: "signed_in" | "confirmation_required";
}
