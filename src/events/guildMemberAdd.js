/**
 
Guild Member Add Event
Yeni bir üye sunucuya katıldığında sadece kayıtsız rolü verir.
Kayıt mesajı kanalda sabit durur.*/

export default {
  name: 'guildMemberAdd',

  async execute(member, client) {
    await assignUnregisteredRole(member);
  },
};

async function assignUnregisteredRole(member) {
  try {
    const roleId = process.env.UNREGISTERED_ROLE_ID;
    if (!roleId) return;

    const role = await member.guild.roles.fetch(roleId).catch(() => null);
    if (!role || member.roles.cache.has(role.id)) return;

    await member.roles.add(role, 'Yeni üye — kayıtsız rolü otomatik atandı');
  } catch (error) {
    console.error([HATA] ${member.user.tag} kullanıcısına rol verilemedi:, error);
  }
}
