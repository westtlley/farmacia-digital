import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GripVertical, 
  Eye, 
  EyeOff, 
  Image, 
  Search, 
  Grid3x3, 
  Tag, 
  Star, 
  FileText,
  Gift,
  Newspaper
} from 'lucide-react';

const sectionIcons = {
  hero: Image,
  search: Search,
  categories: Grid3x3,
  promotions: Tag,
  featured: Star,
  cta: FileText,
  benefits: Gift,
  blog: Newspaper
};

const sectionLabels = {
  hero: 'Banner Hero',
  search: 'Barra de Busca',
  categories: 'Categorias',
  promotions: 'Ofertas',
  featured: 'Mais Vendidos',
  cta: 'Enviar Receita',
  benefits: 'Benefícios',
  blog: 'Blog'
};

export default function SectionEditor({ sections, onChange }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    onChange(updatedItems);
  };

  const toggleSection = (id) => {
    onChange(sections.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GripVertical className="w-5 h-5 text-emerald-600" />
          Seções da Página Inicial
        </CardTitle>
        <p className="text-sm text-gray-500">Arraste para reordenar, clique no olho para ativar/desativar</p>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {sections
                  .sort((a, b) => a.order - b.order)
                  .map((section, index) => {
                    const Icon = sectionIcons[section.type] || Image;
                    return (
                      <Draggable key={section.id} draggableId={section.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                              snapshot.isDragging
                                ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                                : section.enabled
                                ? 'border-gray-200 bg-white hover:border-emerald-300'
                                : 'border-gray-100 bg-gray-50 opacity-60'
                            }`}
                          >
                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-5 h-5 text-gray-400" />
                            </div>

                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              section.enabled ? 'bg-emerald-100' : 'bg-gray-100'
                            }`}>
                              <Icon className={`w-5 h-5 ${section.enabled ? 'text-emerald-600' : 'text-gray-400'}`} />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{sectionLabels[section.type]}</h4>
                                {!section.enabled && (
                                  <Badge variant="secondary" className="text-xs">Desativado</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">Posição {section.order}</p>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleSection(section.id)}
                              className="rounded-full"
                            >
                              {section.enabled ? (
                                <Eye className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <EyeOff className="w-5 h-5 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}