import React from 'react';
import { useState } from 'react';
import { useLicense } from '../../contexts/LicenseContext';
import { Crown, Check, X } from 'lucide-react';

interface TemplateSelectorProps {
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
  allowProSelection?: boolean;
  disabled?: boolean;
}

const templates = [
  {
    id: 'template1',
    name: 'Classic Free',
    description: 'Mise en page simple et sobre (gratuit)',
    isPro: false,
    preview: 'https://i.ibb.co/kV2f4xWC/1.png'
  },
  {
    id: 'template2',
    name: 'Noir Classique Pro',
    description: 'Design classique avec fond noir',
    isPro: true,
    preview: 'https://i.ibb.co/dJcZM05n/2.png'
  },
  {
    id: 'template3',
    name: 'Moderne avec formes vertes Pro',
    description: 'Design moderne ',
    isPro: true,
    preview: 'https://i.ibb.co/xqJDgm4J/3.png'
  },
  {
    id: 'template4',
    name: 'Bleu Élégant Pro',
    description: 'Design élégant avec thème bleu',
    isPro: true,
    preview: 'https://i.ibb.co/5ggh4jzf/4.png'
  },
  {
    id: 'template5',
    name: 'Minimal Bleu Pro',
    description: 'Design minimaliste avec accents bleus',
    isPro: true,
    preview: 'https://i.ibb.co/B5m2PLbL/5.png'
  },
  {
    id: 'template6',
    name: 'Executive Bronze Pro',
    description: 'Design premium avec tons ardoise et bronze',
    isPro: true,
    preview: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='600' viewBox='0 0 900 600'%3E%3Crect width='900' height='600' fill='%23f8fafc'/%3E%3Crect x='40' y='40' width='820' height='120' rx='24' fill='%231f2937'/%3E%3Crect x='610' y='70' width='190' height='60' rx='18' fill='%23475569'/%3E%3Crect x='70' y='210' width='360' height='120' rx='22' fill='%23ffffff' stroke='%23cbd5e1'/%3E%3Crect x='470' y='210' width='360' height='120' rx='22' fill='%23ffffff' stroke='%23cbd5e1'/%3E%3Crect x='70' y='370' width='760' height='90' rx='18' fill='%23ffffff' stroke='%23cbd5e1'/%3E%3Crect x='70' y='490' width='420' height='60' rx='18' fill='%23ffffff' stroke='%23cbd5e1'/%3E%3Crect x='540' y='490' width='290' height='60' rx='18' fill='%23b45309'/%3E%3C/svg%3E"
  },
  {
    id: 'template7',
    name: 'Atlas Emeraude Pro',
    description: 'Design premium avec accents emeraude et marine',
    isPro: true,
    preview: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='600' viewBox='0 0 900 600'%3E%3Crect width='900' height='600' fill='%23f8fafc'/%3E%3Crect x='40' y='40' width='820' height='120' rx='24' fill='%230f172a'/%3E%3Crect x='600' y='64' width='210' height='72' rx='26' fill='%23065f46'/%3E%3Crect x='70' y='200' width='360' height='132' rx='24' fill='%23ffffff' stroke='%23dbe4ea'/%3E%3Crect x='470' y='200' width='360' height='132' rx='24' fill='%23ecfdf5' stroke='%23dbe4ea'/%3E%3Crect x='70' y='368' width='760' height='102' rx='24' fill='%23ffffff' stroke='%23dbe4ea'/%3E%3Crect x='70' y='500' width='430' height='58' rx='20' fill='%23f8fafc' stroke='%23dbe4ea'/%3E%3Crect x='540' y='492' width='290' height='74' rx='22' fill='%230f766e'/%3E%3C/svg%3E"
  },
  {
    id: 'template8',
    name: 'Prestige Graphite Pro',
    description: 'Design avance avec graphite et accents or',
    isPro: true,
    preview: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='600' viewBox='0 0 900 600'%3E%3Crect width='900' height='600' fill='%23ffffff'/%3E%3Crect x='40' y='40' width='820' height='118' rx='24' fill='%23111827'/%3E%3Crect x='70' y='62' width='8' height='72' rx='4' fill='%23c0841a'/%3E%3Crect x='610' y='62' width='205' height='78' rx='26' fill='rgba(255,255,255,0.08)'/%3E%3Crect x='70' y='196' width='360' height='128' rx='24' fill='%23f8fafc' stroke='%23e5e7eb'/%3E%3Crect x='470' y='196' width='360' height='128' rx='24' fill='%23fffbeb' stroke='%23e5e7eb'/%3E%3Crect x='70' y='356' width='760' height='108' rx='24' fill='%23ffffff' stroke='%23e5e7eb'/%3E%3Crect x='70' y='494' width='420' height='64' rx='22' fill='%23fffbeb' stroke='%23e5e7eb'/%3E%3Crect x='532' y='486' width='298' height='80' rx='22' fill='%23111827'/%3E%3Crect x='560' y='516' width='242' height='30' rx='14' fill='%23c0841a'/%3E%3C/svg%3E"
  }
];

interface TemplateSelectorProps {
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
  allowProSelection?: boolean;
  disabled?: boolean;
  showPreviewButton?: boolean;
}

export default function TemplateSelector({ selectedTemplate, onTemplateSelect, allowProSelection = true, disabled = false, showPreviewButton = false }: TemplateSelectorProps) {
  const { licenseType } = useLicense();
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  return (
    <>
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Choisir un modèle</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {templates.map((template) => {
          const isLocked = template.isPro && licenseType !== 'pro' && !allowProSelection;
          const isSelected = selectedTemplate === template.id;
          
          return (
            <div
              key={template.id}
              className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                disabled ? 'opacity-50 cursor-not-allowed' :
                isSelected 
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20'
              }`}
              onClick={() => !disabled && onTemplateSelect(template.id)}
            >
              {/* Preview placeholder */}
              <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded mb-3 flex items-center justify-center relative overflow-hidden">
                <img 
                  src={template.preview} 
                  alt={`Aperçu ${template.name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling!.style.display = 'flex';
                  }}
                />
                <div className="hidden w-full h-full items-center justify-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Aperçu</span>
                </div>
              </div>
              
              {/* Template info */}
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{template.name}</h4>
                  {template.isPro && (
                    <Crown className="w-3 h-3 text-yellow-500" />
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{template.description}</p>
                
                {template.isPro && (
                  <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                    licenseType === 'pro' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                  }`}>
                    {licenseType === 'pro' ? 'Disponible' : 'Pro'}
                  </span>
                )}
              </div>
              
              {/* Preview button */}
              {showPreviewButton && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewTemplate(template.id);
                  }}
                  className="w-full mt-2 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Aperçu
                </button>
              )}
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {licenseType !== 'pro' && (
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <Crown className="w-4 h-4 inline mr-1" />
            Les modèles Pro sont disponibles en aperçu. Pour les télécharger en PDF, passez à la version Pro !
          </p>
        </div>
      )}
    </div>
    
    {/* Preview Modal */}
    {previewTemplate && (
      <div className="fixed inset-0 z-[70] bg-black bg-opacity-75 flex items-center justify-center p-4">
        <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Aperçu - {templates.find(t => t.id === previewTemplate)?.name}
            </h3>
            <button
              onClick={() => setPreviewTemplate(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-4">
            <img 
              src={templates.find(t => t.id === previewTemplate)?.preview}
              alt={`Aperçu ${templates.find(t => t.id === previewTemplate)?.name}`}
              className="w-full h-auto max-h-[70vh] object-contain rounded"
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
