import type ProductLine from "./product-line";

export default interface Factory {
  products: ProductLine[];
  icon?: string;
}
