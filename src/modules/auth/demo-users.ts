export type FeedbackRole =
  | "customer"
  | "moderator"
  | "product_manager"
  | "admin";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: FeedbackRole;
};

export const demoUsers: DemoUser[] = [
  {
    id: "fb-user-customer",
    name: "Noah Garcia",
    email: "noah@acme.test",
    role: "customer",
  },
  {
    id: "fb-user-moderator",
    name: "Lena Park",
    email: "lena@product.test",
    role: "moderator",
  },
  {
    id: "fb-user-pm",
    name: "Marco Bell",
    email: "marco@product.test",
    role: "product_manager",
  },
  {
    id: "fb-user-admin",
    name: "Tina Wong",
    email: "tina@product.test",
    role: "admin",
  },
];

export function getDemoUserById(id: string | undefined) {
  return demoUsers.find((user) => user.id === id) ?? null;
}
