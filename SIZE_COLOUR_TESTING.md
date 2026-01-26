# Size-Colour Testing Guide

## ✅ Manual Testing Checklist

### Test 1: Single Size with Multiple Colours

**Setup:**
1. Go to seller dashboard
2. Click "Create Product"
3. Fill in basic details (name, description, category, images)

**Test Steps:**
```
1. In "Size-specific Pricing & Inventory" section:
   ├─ Row 1:
   │  ├─ Size: "One Size"
   │  ├─ Colour: "Pink"
   │  ├─ Quantity: 10
   │  ├─ Price: $20
   │  └─ Click "Add Another Size"
   │
   └─ Row 2:
      ├─ Size: "One Size"
      ├─ Colour: "Red"
      ├─ Quantity: 15
      ├─ Price: $20
      └─ [Form Complete]

2. Click "Create Product"

3. Expected Result:
   ✅ Product created successfully (NO error)
   ❌ Should NOT see: "Duplicate size names are not allowed"
   
4. Verify in database:
   SELECT sizes FROM products WHERE id = <product_id>;
   
   Output should be:
   [
     {"size": "One Size", "colour": "Pink", "quantity": 10, "price": 20},
     {"size": "One Size", "colour": "Red", "quantity": 15, "price": 20}
   ]
```

---

### Test 2: Multiple Sizes with Colours

**Test Steps:**
```
1. Create Product with:
   ├─ Row 1: Size="S", Colour="Red", Quantity=10, Price=$20
   ├─ Row 2: Size="S", Colour="Blue", Quantity=8, Price=$20
   ├─ Row 3: Size="M", Colour="Red", Quantity=12, Price=$25
   └─ Row 4: Size="M", Colour="Blue", Quantity=10, Price=$25

2. Click "Create Product"

3. Expected Result:
   ✅ Product created successfully

4. Database verification:
   [
     {"size": "S", "colour": "Red", "quantity": 10, "price": 20},
     {"size": "S", "colour": "Blue", "quantity": 8, "price": 20},
     {"size": "M", "colour": "Red", "quantity": 12, "price": 25},
     {"size": "M", "colour": "Blue", "quantity": 10, "price": 25}
   ]
```

---

### Test 3: Validation - Duplicate (size, colour) Pairs

**Test Steps:**
```
1. Try to create product with:
   ├─ Row 1: Size="S", Colour="Red", Quantity=10, Price=$20
   └─ Row 2: Size="S", Colour="Red", Quantity=5, Price=$20  ← DUPLICATE

2. Click "Create Product"

3. Expected Result:
   ❌ Error message appears:
      "Duplicate size-colour combinations are not allowed"
   
4. Form remains open with data intact
   (User can correct and retry)
```

---

### Test 4: QuickViewModal UI - Single Size

**Setup:** Product with "One Size" + Pink + Red

**Test Steps:**
```
1. Go to home page or product listing
2. Click on the product card
3. QuickViewModal opens

4. Visual Check:
   ├─ Size Selector:
   │  └─ ❌ Should NOT be visible (single size)
   │
   └─ Colour Selector:
      └─ ✅ SHOULD be visible with:
         ├─ [ Pink ] button
         └─ [ Red ] button

5. Click "Pink"
   └─ Button appears selected/highlighted

6. Click "Add to Cart"
   └─ ✅ Product added with colour="Pink"

7. Repeat: Select "Red" and add to cart
   └─ ✅ Product added with colour="Red"
```

---

### Test 5: QuickViewModal UI - Multiple Sizes

**Setup:** Product with:
- S + Red, S + Blue
- M + Red, M + Blue

**Test Steps:**
```
1. Click product to open QuickViewModal

2. Size Selector (VISIBLE):
   ├─ ✅ [ S ] button shown
   ├─ ✅ [ M ] button shown
   └─ Initially selected: "S"

3. Initial Colour Options:
   ├─ ✅ [ Red ] - available for S
   └─ ✅ [ Blue ] - available for S

4. Click Size "M":
   ├─ Colour selector UPDATES
   ├─ ✅ [ Red ] - available for M
   └─ ✅ [ Blue ] - available for M

5. Select Colour "Red"
6. Click "Add to Cart"
   └─ ✅ Added: size="M", colour="Red"

7. Verify Cart:
   Product: [Product Name]
   Size: M
   Colour: Red
   Quantity: 1
```

---

### Test 6: Stock Calculation

**Setup:** Product with:
- S + Red (quantity: 5)
- S + Blue (quantity: 8)
- M + Red (quantity: 0)

**Test Steps:**
```
1. Open QuickViewModal

2. Select Size "S":
   ├─ Red: Quantity available = 5 ✅
   └─ Blue: Quantity available = 8 ✅

3. Select Size "M":
   ├─ Red: Out of stock (quantity = 0) ❌
   └─ [Red button appears disabled/grayed out]

4. Try to add "M" + "Red":
   └─ Error: "Not enough stock for size M in Red"

5. Correct Test:
   ├─ Select S + Blue
   ├─ Add quantity: 5
   ├─ Click "Add to Cart"
   └─ ✅ Allowed (stock available)

6. Try to add quantity 10:
   ├─ Error: "Not enough stock... Available: 8"
   └─ ✅ Validation works
```

---

### Test 7: Price & Market Price Tracking

**Setup:** Product with:
- S + Red: price=$20, market_price=$30
- S + Blue: price=$20, market_price=$35
- M + Red: price=$25, market_price=$35
- M + Blue: price=$25, market_price=$40

**Test Steps:**
```
1. Open QuickViewModal

2. Select S + Red:
   ├─ ✅ Display price: $20
   ├─ ✅ Strikethrough market price: $30
   └─ ✅ Discount shown: 33%

3. Select S + Blue:
   ├─ ✅ Display price: $20
   ├─ ✅ Strikethrough market price: $35
   └─ ✅ Discount shown: 43%

4. Select M + Red:
   ├─ ✅ Display price: $25
   ├─ ✅ Market price: $35
   └─ ✅ Discount shown: 29%

5. Verify cart shows correct price for selected variant
```

---

### Test 8: COD Eligibility per (size, colour)

**Setup:** Product with:
- S + Red: cod_eligible = true
- S + Blue: cod_eligible = false
- M + Red: cod_eligible = true

**Test Steps:**
```
1. Select S + Red → COD Available ✅
2. Select S + Blue → COD Not Available ❌
3. Select M + Red → COD Available ✅

4. Verify in Cart Checkout:
   └─ COD option shown/hidden based on selected (size, colour)

5. Verify in Order:
   └─ cod_eligible field matches the (size, colour) selected
```

---

## 🔍 Database Verification Queries

### Check Product Sizes Structure
```sql
SELECT id, name, sizes 
FROM products 
WHERE name LIKE '%One Size%'
LIMIT 1;

-- Expected output:
-- id | name | sizes
-- 123 | Shirt | [{"size":"One Size","colour":"Pink","quantity":10,"price":20},{"size":"One Size","colour":"Red","quantity":15,"price":20}]
```

### Count Unique (size, colour) Combinations
```sql
SELECT 
  id, name,
  jsonb_array_length(sizes) as total_combinations,
  (SELECT COUNT(DISTINCT size) FROM jsonb_array_elements(sizes) s(data)) as unique_sizes,
  (SELECT COUNT(DISTINCT (data->>'colour')) FROM jsonb_array_elements(sizes) s(data)) as unique_colours
FROM products
WHERE sizes IS NOT NULL
LIMIT 5;
```

### Find All Products with Same Size, Different Colours
```sql
SELECT id, name, sizes
FROM products
WHERE sizes @> '[{"size":"One Size"}]'::jsonb
AND jsonb_array_length(sizes) > 1;
```

---

## 🚀 Testing Environment

### Local Testing
```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Run locally
npm start

# 3. Navigate to http://localhost:3000

# 4. Go to seller dashboard (login required)

# 5. Create product with size-colour variants
```

### Production Testing
```bash
# Already deployed at:
https://www.thenilekart.com

# Seller dashboard:
https://www.thenilekart.com/seller-dashboard

# Production build version:
main.b084533c.js
```

---

## ⚠️ Known Edge Cases

### Edge Case 1: "Default" Colour for No Colour Specified
```
If colour is empty string or null:
└─ Treated as "Default" internally
└─ Displayed as "Default" in UI
└─ Stored in database with colour="Default"
```

### Edge Case 2: Case Sensitivity
```
"One Size" and "one size" are treated as SAME size
"Pink" and "pink" are treated as SAME colour
(Lowercase comparison used)
```

### Edge Case 3: Whitespace Handling
```
" One Size " → trimmed to "One Size"
"  Pink  " → trimmed to "Pink"
```

### Edge Case 4: Empty Quantity
```
If quantity = 0:
└─ Still shown in list (not filtered out)
└─ But cannot be added to cart
└─ Backend validates: quantity > 0
```

---

## 🎯 Performance Testing

### Load Testing
```
Scenario: View product with max combinations
- Product with 10 sizes × 10 colours = 100 combinations

Test:
├─ QuickViewModal load time: <500ms ✅
├─ Size selector rendering: <100ms ✅
├─ Colour selector update: <50ms ✅
└─ Overall response: Smooth/no lag

Tools:
├─ Chrome DevTools > Performance tab
├─ Network tab to check JS load
└─ React DevTools Profiler
```

---

## ✅ Final Verification Checklist

```
Frontend:
☑ Validation rejects duplicate (size, colour) ✅
☑ Validation allows same size, different colours ✅
☑ QuickViewModal shows size selector only if multiple sizes ✅
☑ Colour selector cascades based on selected size ✅
☑ Add to cart includes selected colour ✅
☑ No TypeScript errors in build ✅

Backend:
☑ Product creation accepts (size, colour) data ✅
☑ Stock lookup uses (size, colour) tuple ✅
☑ Price lookup uses (size, colour) tuple ✅
☑ COD eligibility per (size, colour) ✅

Deployment:
☑ Frontend built successfully ✅
☑ Deployed to EC2 ✅
☑ Nginx serving new version ✅
☑ No 404 or 500 errors ✅

User Experience:
☑ Sellers can create colour variants ✅
☑ Customers see size selector only when needed ✅
☑ Customers see colour selector for selected size ✅
☑ Purchase flow preserves colour selection ✅
```

---

## 📞 Support

If issues found during testing:

1. **Clear browser cache:**
   ```
   Chrome: Ctrl+Shift+Del → Clear browsing data → All time
   ```

2. **Check production version:**
   ```
   View page source → main.b084533c.js → should be latest
   ```

3. **Check browser console:**
   ```
   F12 → Console tab → Look for JavaScript errors
   ```

4. **Backend logs:**
   ```
   ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250
   tail -100 /tmp/backend.log
   ```

5. **Database:**
   ```
   psql -U nile_user -d thenilekart
   SELECT * FROM products WHERE id = <product_id> \gx
   ```
