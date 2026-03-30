const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiDocument = require("./openapi.json");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");

const PORT = process.env.PORT || 3000;
const ACCESS_SECRET = process.env.ACCESS_SECRET || "access_secret_change_me";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret_change_me";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

const ROLES = {
  USER: "user",
  SELLER: "seller",
  ADMIN: "admin",
};

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

const users = [];
const products = [];
const refreshTokens = new Set();

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    role: u.role,
    blocked: u.blocked,
  };
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (user.blocked) {
      return res.status(403).json({ error: "Account is blocked" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode}`);
  });
  next();
});

app.post("/api/auth/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;
  if (!email || !first_name || !last_name || !password) {
    return res
      .status(400)
      .json({ error: "email, first_name, last_name and password are required" });
  }
  const normalized = String(email).trim().toLowerCase();
  if (users.some((u) => u.email === normalized)) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const user = {
    id: nanoid(),
    email: normalized,
    first_name,
    last_name,
    passwordHash: await hashPassword(password),
    role: ROLES.USER,
    blocked: false,
  };
  users.push(user);
  res.status(201).json(publicUser(user));
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const user = users.find((u) => u.email === String(email).trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (user.blocked) {
    return res.status(403).json({ error: "Account is blocked" });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);
  res.json({ accessToken, refreshToken });
});

app.post("/api/auth/refresh", (req, res) => {
  const refreshToken =
    req.get("X-Refresh-Token") || req.get("x-refresh-token") || req.headers["x-refresh-token"];
  if (!refreshToken) {
    return res.status(400).json({ error: "X-Refresh-Token header is required" });
  }
  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (!user || user.blocked) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({ error: "User not found or blocked" });
    }
    refreshTokens.delete(refreshToken);
    const newAccess = generateAccessToken(user);
    const newRefresh = generateRefreshToken(user);
    refreshTokens.add(newRefresh);
    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json(publicUser(req.user));
});

app.get("/api/users", authMiddleware, roleMiddleware(ROLES.ADMIN), (req, res) => {
  res.json(users.map(publicUser));
});

app.get("/api/users/:id", authMiddleware, roleMiddleware(ROLES.ADMIN), (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(publicUser(user));
});

app.put("/api/users/:id", authMiddleware, roleMiddleware(ROLES.ADMIN), async (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { first_name, last_name, email, role, blocked, password } = req.body;
  if (email !== undefined && email !== null) {
    const normalized = String(email).trim().toLowerCase();
    const taken = users.some((u) => u.id !== user.id && u.email === normalized);
    if (taken) return res.status(409).json({ error: "Email already in use" });
    user.email = normalized;
  }
  if (first_name !== undefined) user.first_name = first_name;
  if (last_name !== undefined) user.last_name = last_name;
  if (role !== undefined) {
    if (![ROLES.USER, ROLES.SELLER, ROLES.ADMIN].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    user.role = role;
  }
  if (blocked !== undefined) {
    if (user.id === req.user.id && blocked === true) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }
    user.blocked = Boolean(blocked);
  }
  if (password) {
    user.passwordHash = await hashPassword(password);
  }
  res.json(publicUser(user));
});

app.delete("/api/users/:id", authMiddleware, roleMiddleware(ROLES.ADMIN), (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.id === req.user.id) {
    return res.status(400).json({ error: "Cannot block yourself" });
  }
  user.blocked = true;
  res.json({ message: "User blocked", user: publicUser(user) });
});

const productRolesRead = [ROLES.USER, ROLES.SELLER, ROLES.ADMIN];
const productRolesWrite = [ROLES.SELLER, ROLES.ADMIN];

app.get(
  "/api/products",
  authMiddleware,
  roleMiddleware(...productRolesRead),
  (req, res) => {
    res.json(products.map((p) => ({ ...p })));
  }
);

app.get(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware(...productRolesRead),
  (req, res) => {
    const p = products.find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: "Product not found" });
    res.json({ ...p });
  }
);

app.post(
  "/api/products",
  authMiddleware,
  roleMiddleware(...productRolesWrite),
  (req, res) => {
    const { title, category, description, price } = req.body;
    if (!title || !category || description === undefined || price === undefined) {
      return res
        .status(400)
        .json({ error: "title, category, description and price are required" });
    }
    const product = {
      id: nanoid(),
      title,
      category,
      description,
      price: Number(price),
    };
    products.push(product);
    res.status(201).json({ ...product });
  }
);

app.put(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware(...productRolesWrite),
  (req, res) => {
    const p = products.find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: "Product not found" });
    const { title, category, description, price } = req.body;
    if (title !== undefined) p.title = title;
    if (category !== undefined) p.category = category;
    if (description !== undefined) p.description = description;
    if (price !== undefined) p.price = Number(price);
    res.json({ ...p });
  }
);

app.delete(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware(ROLES.SELLER, ROLES.ADMIN),
  (req, res) => {
    const idx = products.findIndex((x) => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Product not found" });
    const [removed] = products.splice(idx, 1);
    res.json({ message: "Deleted", product: removed });
  }
);

app.get("/", (req, res) => {
  res.type("text/plain; charset=utf-8").send(
    [
      "Это только API (Express). Главной страницы здесь нет.",
      "",
      "Откройте интерфейс магазина: http://localhost:5173",
      "Если браузер пишет «отказано в соединении», запустите фронтенд:",
      "  из корня проекта: npm run dev",
      "  или: cd frontend && npm run dev",
      "",
      `Запросы к API: http://localhost:${PORT}/api/...`,
      `Swagger UI: http://localhost:${PORT}/api-docs`,
    ].join("\n")
  );
});

async function seedDemoAccounts() {
  if (!users.some((u) => u.role === ROLES.ADMIN)) {
    users.push({
      id: nanoid(),
      email: "admin@example.com",
      first_name: "System",
      last_name: "Administrator",
      passwordHash: await hashPassword("Admin123!"),
      role: ROLES.ADMIN,
      blocked: false,
    });
    console.log("Demo admin: admin@example.com / Admin123!");
  }
  if (!users.some((u) => u.email === "seller@example.com")) {
    users.push({
      id: nanoid(),
      email: "seller@example.com",
      first_name: "Demo",
      last_name: "Seller",
      passwordHash: await hashPassword("Seller123!"),
      role: ROLES.SELLER,
      blocked: false,
    });
    console.log("Demo seller: seller@example.com / Seller123!");
  }
  if (!users.some((u) => u.email === "user@example.com")) {
    users.push({
      id: nanoid(),
      email: "user@example.com",
      first_name: "Demo",
      last_name: "User",
      passwordHash: await hashPassword("User123!"),
      role: ROLES.USER,
      blocked: false,
    });
    console.log("Demo user: user@example.com / User123!");
  }
}

async function seedDemoProducts() {
  // Чтобы фронт сразу показывал контент для проверки заданий.
  if (products.length > 0) return;

  const demo = [
    {
      title: "Кофейные зерна 1кг",
      category: "Еда",
      description: "Арабика, средняя обжарка. Подходит для кофемашины и турки.",
      price: 1290,
    },
    {
      title: "Наушники Bluetooth",
      category: "Электроника",
      description: "Время работы до 20 часов, поддержка быстрой зарядки.",
      price: 3490,
    },
    {
      title: "Книга «Чистый код»",
      category: "Книги",
      description: "Практики написания поддерживаемого кода. Твёрдый переплёт.",
      price: 2790,
    },
    {
      title: "Смарт-часы",
      category: "Электроника",
      description: "Мониторинг активности, уведомления, водозащита.",
      price: 5990,
    },
  ];

  products.push(
    ...demo.map((p) => ({
      id: nanoid(),
      ...p,
    }))
  );

  console.log(`Demo products seeded: ${demo.length}`);
}

app.listen(PORT, async () => {
  await seedDemoAccounts();
  await seedDemoProducts();
  console.log(`API http://localhost:${PORT}`);
  console.log(`Swagger http://localhost:${PORT}/api-docs`);
  console.log(`UI  http://localhost:5173 (npm run dev в корне или cd frontend && npm run dev)`);
});
