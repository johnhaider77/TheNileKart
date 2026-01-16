// ================================================
// TheNileKart Categories Configuration
// ================================================
// Centralized category definitions to ensure consistency
// across all components and pages

export interface Category {
  name: string;
  icon: string;
  path: string;
  description?: string;
}

export const CATEGORIES: Category[] = [
  { 
    name: 'Mobiles, Tablets & Accessories', 
    icon: '📱', 
    path: '/products?category=Mobiles%2C%20Tablets%20%26%20Accessories',
    description: 'Smartphones, tablets, chargers, cases, and mobile accessories'
  },
  { 
    name: 'Computers & Office Supplies', 
    icon: '💻', 
    path: '/products?category=Computers%20%26%20Office%20Supplies',
    description: 'Laptops, desktops, printers, office equipment, and supplies'
  },
  { 
    name: 'TV, Appliances & Electronics', 
    icon: '📺', 
    path: '/products?category=TV%2C%20Appliances%20%26%20Electronics',
    description: 'Televisions, home appliances, audio systems, and electronics'
  },
  { 
    name: "Women's Fashion", 
    icon: '👗', 
    path: "/products?category=Women%27s%20Fashion",
    description: 'Clothing, shoes, accessories, and jewelry for women'
  },
  { 
    name: "Men's Fashion", 
    icon: '👔', 
    path: "/products?category=Men%27s%20Fashion",
    description: 'Clothing, shoes, accessories, and grooming for men'
  },
  { 
    name: 'Kids Fashion', 
    icon: '👶', 
    path: '/products?category=Kids Fashion',
    description: 'Clothing, shoes, and accessories for children and babies'
  },
  { 
    name: 'Health, Beauty & Perfumes', 
    icon: '💄', 
    path: '/products?category=Health%2C%20Beauty%20%26%20Perfumes',
    description: 'Skincare, makeup, fragrances, and health products'
  },
  { 
    name: 'Intimacy', 
    icon: '🌹', 
    path: '/products?category=Intimacy',
    description: 'Personal intimate products and accessories'
  },
  { 
    name: 'Grocery', 
    icon: '🛒', 
    path: '/products?category=Grocery',
    description: 'Food, beverages, household essentials, and daily necessities'
  },
  { 
    name: 'Home, Kitchen & Pets', 
    icon: '🏠', 
    path: '/products?category=Home%2C%20Kitchen%20%26%20Pets',
    description: 'Home decor, kitchen appliances, cookware, and pet supplies'
  },
  { 
    name: 'Tools & Home Improvement', 
    icon: '🔧', 
    path: '/products?category=Tools%20%26%20Home%20Improvement',
    description: 'Power tools, hand tools, hardware, and home improvement supplies'
  },
  { 
    name: 'Toys, Games & Baby', 
    icon: '🧸', 
    path: '/products?category=Toys%2C%20Games%20%26%20Baby',
    description: 'Toys, games, baby products, and children entertainment'
  },
  { 
    name: 'Sports, Fitness & Outdoors', 
    icon: '⚽', 
    path: '/products?category=Sports%2C%20Fitness%20%26%20Outdoors',
    description: 'Sports equipment, fitness gear, outdoor activities, and athletic wear'
  },
  { 
    name: 'Books', 
    icon: '📚', 
    path: '/products?category=Books',
    description: 'Fiction, non-fiction, educational books, and literature'
  },
  { 
    name: 'Video Games', 
    icon: '🎮', 
    path: '/products?category=Video Games',
    description: 'Console games, PC games, gaming accessories, and software'
  },
  { 
    name: 'Automotive', 
    icon: '🚗', 
    path: '/products?category=Automotive',
    description: 'Car accessories, auto parts, motorcycle gear, and vehicle care'
  }
];

// Export category names only for dropdowns and selectors
export const CATEGORY_NAMES: string[] = CATEGORIES.map(cat => cat.name);

// Helper functions for category operations
export const getCategoryByName = (name: string): Category | undefined => {
  return CATEGORIES.find(cat => cat.name === name);
};

export const getCategoryIcon = (name: string): string => {
  const category = getCategoryByName(name);
  return category?.icon || '📦';
};

export const getCategoryPath = (name: string): string => {
  const category = getCategoryByName(name);
  return category?.path || `/products?category=${encodeURIComponent(name)}`;
};

// Category groups for better organization (optional)
export const CATEGORY_GROUPS = {
  electronics: [
    'Mobiles, Tablets & Accessories',
    'Computers & Office Supplies', 
    'TV, Appliances & Electronics',
    'Video Games'
  ],
  fashion: [
    "Women's Fashion",
    "Men's Fashion", 
    'Kids Fashion',
    'Health, Beauty & Perfumes'
  ],
  home: [
    'Home, Kitchen & Pets',
    'Tools & Home Improvement',
    'Grocery'
  ],
  lifestyle: [
    'Sports, Fitness & Outdoors',
    'Toys, Games & Baby',
    'Books',
    'Automotive',
    'Intimacy'
  ]
};