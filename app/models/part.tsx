export default interface Part {
  name: string;
  className: string;
  slug: string;
  iconSmall: string;
  iconLarge: string;
  fluid: boolean;
  gas: boolean;
  description: string;
  stackSize: number;
  sinkPoints: number;
  sinkable: boolean;
  color: string;
  isRawResource: boolean;
  fuelValue: number;
}
