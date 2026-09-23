import { PageContainer } from '@/components/common/PageContainer'
import { SectionTitle } from '@/components/common/SectionTitle'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { faqItems } from '@/features/faq/faq.data'

export function FaqPage() {
  return (
    <PageContainer>
      <SectionTitle title="Preguntas frecuentes" level="h1" />
      <Accordion>
        {faqItems.map((item, index) => (
          <AccordionItem key={item.question} value={String(index)}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>
              <p>{item.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </PageContainer>
  )
}
