export function validatePakistanPhoneNumber(phone) {
  const regex = /^\+923[0-9]{9}$/;
  return regex.test(phone);
}
