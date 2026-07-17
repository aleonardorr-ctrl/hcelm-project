export type PharmacyFefoAction =
  | 'NORMAL'
  | 'ALERT'
  | 'SUGGEST_DISCOUNT'
  | 'REQUIRE_AUTHORIZATION';

export type PharmacyFefoRuleKey =
  | 'NORMAL'
  | 'WATCH'
  | 'PROMOTION'
  | 'CRITICAL';

export class UpdatePharmacyFefoRuleDto {
  id!: PharmacyFefoRuleKey;
  label!: string;
  minDays!: number;
  maxDays!: number | null;
  discountPercent!: number;
  action!: PharmacyFefoAction;
}

export class UpdatePharmacyFefoRulesDto {
  rules!: UpdatePharmacyFefoRuleDto[];
}