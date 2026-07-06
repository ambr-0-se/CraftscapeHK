import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('ai_creations')
export class AiCreation {
  @PrimaryColumn()
  id: string;

  @Column()
  customerId: string;

  @Column()
  craftId: string;

  @Column('json')
  craftName: { zh: string; en: string };

  @Column('text')
  prompt: string;

  @Column('text')
  imageUrl: string;

  @Column('json')
  referenceImageUrls: string[];

  @Column()
  createdAt: string;
}
