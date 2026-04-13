import React from 'react';
import { Invoice, Quote } from '../../contexts/DataContext';
import Template1Classic from './Template1Classic';
import Template2Modern from './Template2Modern';
import Template3Minimal from './Template3Minimal';
import Template4Corporate from './Template4Corporate';
import Template5Premium from './Template5Premium';
import Template6Executive from './Template6Executive';
import Template7Atlas from './Template7Atlas';
import Template8Prestige from './Template8Prestige';
import type { TemplateCompany } from './Template1Classic';

interface TemplateRendererProps {
  templateId: string;
  data: Invoice | Quote;
  type: 'invoice' | 'quote';
  includeSignature?: boolean;
  companyOverride?: TemplateCompany;
}

export default function TemplateRenderer({ templateId, data, type, includeSignature = false, companyOverride }: TemplateRendererProps) {
  switch (templateId) {
    case 'template1':
      return <Template1Classic data={data} type={type} includeSignature={includeSignature} companyOverride={companyOverride} />;
    case 'template2':
      return <Template2Modern data={data} type={type} includeSignature={includeSignature} companyOverride={companyOverride} />;
    case 'template3':
      return <Template3Minimal data={data} type={type} includeSignature={includeSignature} companyOverride={companyOverride} />;
    case 'template4':
      return <Template4Corporate data={data} type={type} includeSignature={includeSignature} companyOverride={companyOverride} />;
    case 'template5':
      return <Template5Premium data={data} type={type} includeSignature={includeSignature} companyOverride={companyOverride} />;
    case 'template6':
      return <Template6Executive data={data} type={type} includeSignature={includeSignature} companyOverride={companyOverride} />;
    case 'template7':
      return <Template7Atlas data={data} type={type} includeSignature={includeSignature} companyOverride={companyOverride} />;
    case 'template8':
      return <Template8Prestige data={data} type={type} includeSignature={includeSignature} companyOverride={companyOverride} />;
    default:
      return <Template1Classic data={data} type={type} includeSignature={includeSignature} companyOverride={companyOverride} />;
  }
}
