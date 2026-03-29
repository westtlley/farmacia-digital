import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Lock, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createPageUrl } from '@/utils';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const params = new URLSearchParams(location.search);
  const nextPath = params.get('next') || createPageUrl('AdminDashboard');

  useEffect(() => {
    const checkCurrentSession = async () => {
      const user = await base44.auth.me();
      if (user?.role === 'admin') {
        navigate(nextPath, { replace: true });
      }
    };

    checkCurrentSession();
  }, [navigate, nextPath]);

  const loginMutation = useMutation({
    mutationFn: () => base44.auth.login(formData.email, formData.password),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success(`Bem-vindo, ${user.full_name || 'administrador'}!`);
      navigate(nextPath, { replace: true });
    },
    onError: (error) => {
      toast.error(error.message || 'Nao foi possivel entrar no painel');
    },
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-2xl">Acesso Administrativo</CardTitle>
            <CardDescription>
              Entre com suas credenciais reais para acessar o painel da farmácia.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  className="pl-10"
                  placeholder="admin@farmacia.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                  className="pl-10"
                  placeholder="Sua senha"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar no painel'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
