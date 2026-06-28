import { Entity, Column, PrimaryColumn } from 'typeorm';
import { UserRole } from '@craftscape/contracts/ownership';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  email?: string;

  @Column()
  displayName: string;

  @Column()
  role: UserRole;

  /** Legacy numeric artisan profile id when role is artisan. */
  @Column({ nullable: true })
  artisanProfileId?: number;
}
