export type StatusStrzelnicy = "oczekujaca" | "zatwierdzona";

export interface Strzelnica {
  id: string;
  nazwa: string;
  adres: string;
  nip: string;
  opis: string;
  kontaktEmail: string;
  kontaktTelefon: string;
  status: StatusStrzelnicy;
}

export interface AdministratorStrzelnicy {
  id: string;
  strzelnicaId: string;
  email: string;
  hasloHash: string;
}

export interface WpisLoguMaili {
  id: string;
  do: string;
  temat: string;
  tresc: string;
  wyslanoAt: string;
}
