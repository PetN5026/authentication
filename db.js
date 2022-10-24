const Sequelize = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { STRING } = Sequelize;
const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

User.byToken = async (token) => {
  try {
    const payload = jwt.verify(token, process.env.JWT);
    console.log("payload", payload);
    const user = await User.findByPk(payload.id);
    console.log("BYTOKEN USERRRRRRRR", user.dataValues.id);
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    console.log("payload", payload);
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};
User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, 10);
});

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  if (user && (await bcrypt.compare(password, user.password))) {
    return jwt.sign({ id: user.id }, process.env.JWT);
  }
  const error = Error("bad credentials");
  console.log(await bcrypt.hash(password, 10));
  error.status = 401;
  throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];

  const notes = [{ text: "text1" }, { text: "text2" }, { text: "text3" }];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  const [text1, text2, text3] = await Promise.all(
    notes.map((txt) => Note.create(txt))
  );

  await lucy.setNotes(text1);
  await moe.setNotes([text2,text3]);
  return {
    users: {
      lucy,
      moe,
      larry,
    },
    texts: {
      text1,
      text2,
      text3
    }
  };
};

Note.belongsTo(User);
User.hasMany(Note);

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
