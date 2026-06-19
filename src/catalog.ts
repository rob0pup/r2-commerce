export type Product = {
  id: string
  name: string
  description: string
  price: number
}

// A small demo catalog, deliberately varied so search-by-meaning beats
// keyword matching. In a real build this comes from the store's product feed.
export const CATALOG: Product[] = [
  { id: "p1", name: "Waterproof Commuter Backpack", description: "Roll-top pack with a padded laptop sleeve, keeps gear dry in heavy rain.", price: 89 },
  { id: "p2", name: "Merino Wool Base Layer", description: "Lightweight thermal top that traps heat without bulk on cold hikes.", price: 64 },
  { id: "p3", name: "Packable Down Jacket", description: "Ultralight insulated jacket for freezing weather, packs into its own pocket.", price: 159 },
  { id: "p4", name: "Trail Running Shoes", description: "Grippy, water-resistant shoes built for muddy off-road trails.", price: 120 },
  { id: "p5", name: "Noise-Cancelling Headphones", description: "Over-ear headphones that silence a noisy office or a long flight.", price: 249 },
  { id: "p6", name: "Wireless Earbuds", description: "Compact sweatproof earbuds for workouts and calls on the go.", price: 99 },
  { id: "p7", name: "Home Espresso Machine", description: "Compact machine that pulls cafe-style shots and steams milk at home.", price: 399 },
  { id: "p8", name: "Insulated Water Bottle", description: "Vacuum flask that keeps drinks cold all day or hot for hours.", price: 35 },
  { id: "p9", name: "Cast Iron Skillet", description: "Pre-seasoned pan for searing, frying, and oven-baking, lasts a lifetime.", price: 45 },
  { id: "p10", name: "Mechanical Keyboard", description: "Tactile hot-swappable keyboard for fast, satisfying typing.", price: 130 },
  { id: "p11", name: "Warm LED Desk Lamp", description: "Dimmable lamp with warm light that's easy on the eyes at night.", price: 55 },
  { id: "p12", name: "Non-Slip Yoga Mat", description: "Cushioned, grippy mat for yoga, stretching, and home workouts.", price: 48 },
  { id: "p13", name: "Standing Desk Converter", description: "Raises your monitor and keyboard so you can work standing up.", price: 180 },
  { id: "p14", name: "Travel Toiletry Bag", description: "Hanging organizer with leakproof bottles for weekend trips.", price: 29 },
  { id: "p15", name: "Smart Sleep Tracker", description: "Bedside device that tracks sleep stages and gently wakes you.", price: 149 },
]
