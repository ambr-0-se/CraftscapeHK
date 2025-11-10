import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; // Will be hashed

  @Column({ default: 'user' })
  role: string; // 'user' | 'artisan' | 'admin'

  @Column({ type: 'text', nullable: true })
  profileJson: string; // Store profile as JSON string

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual property to get/set profile as object
  get profile(): any {
    try {
      return this.profileJson ? JSON.parse(this.profileJson) : {};
    } catch {
      return {};
    }
  }

  set profile(value: any) {
    this.profileJson = JSON.stringify(value || {});
  }
}

