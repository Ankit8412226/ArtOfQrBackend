class User {
  constructor(email, name, id = null, createdAt = null) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.createdAt = createdAt;
  }

  static fromSupabase(supabaseUser) {
    return new User(
      supabaseUser.email || "",
      supabaseUser.user_metadata?.name || null,
      supabaseUser.id,
      supabaseUser.created_at
    );
  }
}

module.exports = User;
