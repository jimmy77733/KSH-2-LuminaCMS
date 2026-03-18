const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");

const DB_PATH = path.join(__dirname, "..", "dev.db");

function main() {
  const db = new Database(DB_PATH);

  db.exec("PRAGMA foreign_keys = ON;");

  const adminRoleName = "Admin";
  const username = "admin";
  const password = "admin123";
  const passwordHash = bcrypt.hashSync(password, 10);

  // 確保 Role: Admin 存在
  db.prepare(
    `
    INSERT OR IGNORE INTO Role (id, name)
    VALUES (
      COALESCE(
        (SELECT id FROM Role WHERE name = @name),
        lower(hex(randomblob(16)))
      ),
      @name
    )
  `,
  ).run({ name: adminRoleName });

  const roleRow = db
    .prepare("SELECT id FROM Role WHERE name = ? LIMIT 1")
    .get(adminRoleName);

  if (!roleRow) {
    throw new Error("Failed to ensure Admin role exists.");
  }

  // 建立 / 覆寫 admin 使用者
  const existingUser = db
    .prepare("SELECT id FROM User WHERE username = ? LIMIT 1")
    .get(username);

  if (existingUser) {
    db.prepare(
      `
      UPDATE User
      SET passwordHash = @passwordHash, roleId = @roleId
      WHERE id = @id
    `,
    ).run({
      id: existingUser.id,
      passwordHash,
      roleId: roleRow.id,
    });
  } else {
    db.prepare(
      `
      INSERT INTO User (id, username, passwordHash, roleId)
      VALUES (lower(hex(randomblob(16))), @username, @passwordHash, @roleId)
    `,
    ).run({
      username,
      passwordHash,
      roleId: roleRow.id,
    });
  }

  console.log("Force DB setup completed. You can now login as admin / admin123.");
}

main();

