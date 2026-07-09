'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Zap,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SettingsPanelHead } from './settings-panel-head';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import type { WhatsAppConfig as WhatsAppConfigType } from '@/types';

const MASKED_TOKEN = '••••••••••••••••';

type ConnectionStatus = 'connected' | 'disconnected' | 'unknown';
type ResetReason = 'token_corrupted' | 'meta_api_error' | null;

export function WhatsAppConfig() {
  const supabase = createClient();
  const { user, accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfigType | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [resetReason, setResetReason] = useState<ResetReason>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const [phoneNumberId, setPhoneNumberId] = useState(''); // Evolution: Instance Name
  const [wabaId, setWabaId] = useState(''); // Evolution: API URL / Chatwoot: Installation URL
  const [accessToken, setAccessToken] = useState(''); // Evolution: API Key / Chatwoot: API Token
  const [verifyToken, setVerifyToken] = useState(''); // Webhook verify token
  const [tokenEdited, setTokenEdited] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [provider, setProvider] = useState<'evolution' | 'chatwoot' | 'waha' | 'direct_waha'>('direct_waha');
  const [cwAccountId, setCwAccountId] = useState('');
  const [cwInboxId, setCwInboxId] = useState('');
  const [wahaSessionName, setWahaSessionName] = useState('');

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [fetchingQr, setFetchingQr] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/whatsapp/webhook`
      : '';



  const fetchConfig = useCallback(async (acctId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('account_id', acctId)
        .maybeSingle();

      if (error) {
        console.error('Falha ao carregar configuração do Supabase:', error);
      }

      if (data) {
        setConfig(data);
        const isCw = data.phone_number_id?.startsWith('chatwoot:');
        const isWaha = data.phone_number_id?.startsWith('waha:');
        const isDirectWaha = isWaha && data.waba_id === 'https://area-51-waha.mypaeg.easypanel.host';
        setProvider(isDirectWaha ? 'direct_waha' : isWaha ? 'waha' : isCw ? 'chatwoot' : 'evolution');
        
        if (isCw) {
          const [_, accountVal, inboxVal] = data.phone_number_id.split(':');
          setCwAccountId(accountVal || '');
          setCwInboxId(inboxVal || '');
          setPhoneNumberId('');
          setWahaSessionName('');
        } else if (isWaha) {
          const [_, sessionVal] = data.phone_number_id.split(':');
          setWahaSessionName(sessionVal || '');
          setPhoneNumberId('');
          setCwAccountId('');
          setCwInboxId('');
        } else {
          setPhoneNumberId(data.phone_number_id || '');
          setCwAccountId('');
          setCwInboxId('');
          setWahaSessionName('');
        }
        
        setWabaId(data.waba_id || '');
        setAccessToken(MASKED_TOKEN);
        setVerifyToken(data.verify_token ? '••••••••' : '');
        setTokenEdited(false);
      } else {
        setConfig(null);
        setProvider('direct_waha');
        setPhoneNumberId('');
        setCwAccountId('');
        setCwInboxId('');
        setWahaSessionName('');
        setWabaId('');
        setAccessToken('');
        setVerifyToken('');
        setTokenEdited(false);
      }

      if (data) {
        try {
          const res = await fetch('/api/whatsapp/config', { method: 'GET' });
          const payload = await res.json();

          if (payload.connected) {
            setConnectionStatus('connected');
            setResetReason(null);
            setStatusMessage('');
          } else {
            setConnectionStatus('disconnected');
            setResetReason(payload.needs_reset ? 'token_corrupted' : payload.reason === 'meta_api_error' ? 'meta_api_error' : null);
            setStatusMessage(payload.message || '');
          }
        } catch (err) {
          console.error('Erro na validação da conexão:', err);
          setConnectionStatus('disconnected');
        }
      } else {
        setConnectionStatus('disconnected');
        setResetReason(null);
        setStatusMessage('');
      }
    } catch (err) {
      console.error('fetchConfig error:', err);
      toast.error('Erro ao carregar a configuração do WhatsApp');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !accountId) {
      setLoading(false);
      return;
    }
    if (!loaded) {
      fetchConfig(accountId);
      setLoaded(true);
    }
  }, [authLoading, profileLoading, user, accountId, fetchConfig, loaded]);

  // Auto-fetch QR code when status is disconnected and config exists
  useEffect(() => {
    if (connectionStatus === 'disconnected' && config) {
      fetchQrCode();
      setPollingActive(true);
    } else {
      setQrCode(null);
      setPollingActive(false);
    }
  }, [connectionStatus, config]);

  // Polling logic to check connection state
  useEffect(() => {
    if (!pollingActive || !accountId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/whatsapp/config', { method: 'GET' });
        const payload = await res.json();
        if (payload.connected) {
          setConnectionStatus('connected');
          setQrCode(null);
          setPollingActive(false);
          toast.success('Dispositivo conectado com sucesso!');
          fetchConfig(accountId);
        }
      } catch (err) {
        console.error('Erro no polling de conexão:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [pollingActive, accountId, fetchConfig]);

  async function fetchQrCode() {
    try {
      setFetchingQr(true);
      const res = await fetch('/api/whatsapp/connect');
      const data = await res.json();
      if (res.ok && data.base64) {
        setQrCode(data.base64);
      } else {
        setQrCode(null);
      }
    } catch (err) {
      console.error('Erro ao buscar QR code:', err);
      setQrCode(null);
    } finally {
      setFetchingQr(false);
    }
  }

  async function handleSave() {
    const isCw = provider === 'chatwoot';
    const isWaha = provider === 'waha';
    const isDirectWaha = provider === 'direct_waha';
    if (isCw) {
      if (!cwAccountId.trim()) {
        toast.error('O ID da Conta Chatwoot é obrigatório');
        return;
      }
      if (!cwInboxId.trim()) {
        toast.error('O ID da Caixa de Entrada (Inbox ID) é obrigatório');
        return;
      }
      if (!wabaId.trim()) {
        toast.error('A URL da Instalação do Chatwoot é obrigatória');
        return;
      }
    } else if (isWaha) {
      if (!wahaSessionName.trim()) {
        toast.error('O Nome da Sessão WAHA é obrigatório');
        return;
      }
      if (!wabaId.trim()) {
        toast.error('A URL do Servidor WAHA é obrigatória');
        return;
      }
    } else if (isDirectWaha) {
      // No validation needed
    } else {
      if (!phoneNumberId.trim()) {
        toast.error('Nome da Instância é obrigatório');
        return;
      }
      if (!wabaId.trim()) {
        toast.error('A URL da API Evolution é obrigatória');
        return;
      }
    }

    const directWahaKey = 'key_328Pwattga9Oa6D0VOErt900Iwxg1KAD';
    const tokenToSave = isDirectWaha ? directWahaKey : accessToken;
    const isTokenEdited = isDirectWaha ? true : tokenEdited;

    if (!config && (!tokenToSave.trim() || !isTokenEdited)) {
      toast.error('A Chave da API (Access Token) é obrigatória no primeiro cadastro');
      return;
    }

    try {
      setSaving(true);

      const phoneIdValue = isCw 
        ? `chatwoot:${cwAccountId.trim()}:${cwInboxId.trim()}` 
        : isWaha 
          ? `waha:${wahaSessionName.trim()}` 
          : isDirectWaha
            ? `waha:direct_${accountId?.slice(0, 8) || 'default'}`
            : phoneNumberId.trim();

      const wabaIdValue = isDirectWaha ? 'https://area-51-waha.mypaeg.easypanel.host' : wabaId.trim();

      const payload: Record<string, unknown> = {
        phone_number_id: phoneIdValue,
        waba_id: wabaIdValue,
        verify_token: verifyToken.trim() || null,
        pin: null, // Bypassed
      };

      if (isTokenEdited && tokenToSave !== MASKED_TOKEN && tokenToSave.trim()) {
        payload.access_token = tokenToSave.trim();
      } else if (config) {
        toast.error('Por favor, reinsira a API Key para salvar alterações');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Falha ao salvar a configuração');
        setSaving(false);
        return;
      }

      toast.success('Configurações salvas e instância verificada com sucesso!');

      if (accountId) await fetchConfig(accountId);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Falha ao salvar configuração');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    try {
      setTesting(true);
      const res = await fetch('/api/whatsapp/config', { method: 'GET' });
      const payload = await res.json();

      if (payload.connected) {
        setConnectionStatus('connected');
        setResetReason(null);
        setStatusMessage('');
        toast.success(`Conexão com a Evolution API estabelecida! Instância: ${phoneNumberId}`);
      } else {
        setConnectionStatus('disconnected');
        setResetReason(payload.needs_reset ? 'token_corrupted' : payload.reason === 'meta_api_error' ? 'meta_api_error' : null);
        setStatusMessage(payload.message || '');
        toast.error(payload.message || 'Falha na conexão com a instância');
      }
    } catch (err) {
      console.error('Test connection error:', err);
      setConnectionStatus('disconnected');
      toast.error('Erro ao testar conexão. Verifique os dados fornecidos.');
    } finally {
      setTesting(false);
    }
  }

  async function handleReset() {
    if (!confirm('Isso excluirá a configuração atual do WhatsApp para que você possa reinseri-la. Continuar?')) {
      return;
    }

    try {
      setResetting(true);
      const res = await fetch('/api/whatsapp/config', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Falha ao redefinir a configuração');
        return;
      }

      toast.success('Configuração limpa. Agora você pode inserir novas credenciais.');
      setConfig(null);
      setPhoneNumberId('');
      setWabaId('');
      setAccessToken('');
      setVerifyToken('');
      setTokenEdited(false);
      setConnectionStatus('disconnected');
      setResetReason(null);
      setStatusMessage('');
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('Falha ao redefinir configuração');
    } finally {
      setResetting(false);
    }
  }

  function handleCopyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('URL do Webhook copiada para a área de transferência');
  }

  if (loading) {
    return (
      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title="Conexão do WhatsApp"
          description="Conecte sua instância da Evolution API. Configure as credenciais e integre seu webhook aqui."
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  const showResetBanner = resetReason === 'token_corrupted';

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Conexão do WhatsApp"
        description="Conecte sua instância da Evolution API. Configure as credenciais e integre seu webhook aqui."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main config form */}
        <div className="space-y-6">
          {showResetBanner && (
            <Alert className="bg-amber-950/40 border-amber-600/40">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <AlertTitle className="text-amber-200 mb-1">
                    Não foi possível descriptografar o token
                  </AlertTitle>
                  <AlertDescription className="text-amber-100/80 text-sm">
                    {statusMessage}
                  </AlertDescription>
                  <Button
                    onClick={handleReset}
                    disabled={resetting}
                    size="sm"
                    className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {resetting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Limpando...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="size-4" />
                        Limpar Configuração
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Alert>
          )}

          {/* Status da Conexão */}
          <Alert className="bg-card border-border">
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <CheckCircle2 className="size-4 text-primary" />
              ) : (
                <XCircle className="size-4 text-red-500" />
              )}
              <AlertTitle className="text-foreground mb-0">
                {connectionStatus === 'connected' ? 'Instância Ativa' : 'Desconectado'}
              </AlertTitle>
            </div>
            <AlertDescription className="text-muted-foreground">
              {connectionStatus === 'connected'
                ? provider === 'chatwoot'
                  ? `A comunicação com a API do Chatwoot está ativa para a caixa de entrada "${cwInboxId}".`
                  : provider === 'waha'
                    ? `A comunicação com o WAHA está ativa para a sessão "${wahaSessionName}".`
                    : `A comunicação com a Evolution API está operando corretamente para a instância "${phoneNumberId}".`
                : statusMessage ||
                  (provider === 'chatwoot'
                    ? 'Configure as credenciais do Chatwoot abaixo para sincronizar as conversas ao Unico Ex.'
                    : provider === 'waha'
                      ? 'Configure as credenciais do WAHA abaixo para integrar o WhatsApp ao Unico Ex.'
                      : 'Configure as credenciais da Evolution API abaixo para integrar o WhatsApp ao Unico Ex.')}
            </AlertDescription>
          </Alert>

          {/* QR Code de Conexão */}
          {connectionStatus === 'disconnected' && config && (provider === 'evolution' || provider === 'waha') && (
            <Card className="border border-border bg-card overflow-hidden">
              <CardHeader>
                <CardTitle className="text-foreground text-base flex items-center gap-2">
                  <Zap className="size-4 text-primary animate-pulse" />
                  Escanear QR Code para Conectar
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Abra o WhatsApp no seu celular, vá em Aparelhos Conectados &gt; Conectar um Aparelho, e aponte a câmera para o QR Code abaixo.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-6 bg-muted/30">
                {fetchingQr ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
                  </div>
                ) : qrCode ? (
                  <div className="space-y-4 text-center">
                    <div className="bg-white p-4 rounded-lg inline-block border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCode} alt="WhatsApp QR Code" className="size-64" />
                    </div>
                    <p className="text-xs text-muted-foreground animate-pulse">
                      Aguardando leitura do QR Code pelo WhatsApp...
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-sm text-muted-foreground">Não foi possível carregar o QR Code automaticamente.</p>
                    <Button onClick={fetchQrCode} size="sm" variant="outline">
                      Gerar Novo QR Code
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Credenciais da API */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Credenciais da API</CardTitle>
              <CardDescription className="text-muted-foreground">
                Selecione o provedor e insira as credenciais de acesso para integrar as mensagens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Provedor de Conexão (Provider)</Label>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    type="button"
                    variant={provider === 'direct_waha' ? 'default' : 'outline'}
                    onClick={() => {
                      setProvider('direct_waha');
                      setWabaId('');
                      setAccessToken('');
                      setTokenEdited(true);
                    }}
                    className="w-full justify-center"
                  >
                    WhatsApp Direto
                  </Button>
                  <Button
                    type="button"
                    variant={provider === 'evolution' ? 'default' : 'outline'}
                    onClick={() => {
                      setProvider('evolution');
                      setWabaId('');
                      setAccessToken('');
                      setTokenEdited(true);
                    }}
                    className="w-full justify-center"
                  >
                    Evolution API
                  </Button>
                  <Button
                    type="button"
                    variant={provider === 'chatwoot' ? 'default' : 'outline'}
                    onClick={() => {
                      setProvider('chatwoot');
                      setWabaId('');
                      setAccessToken('');
                      setTokenEdited(true);
                    }}
                    className="w-full justify-center"
                  >
                    Chatwoot
                  </Button>
                  <Button
                    type="button"
                    variant={provider === 'waha' ? 'default' : 'outline'}
                    onClick={() => {
                      setProvider('waha');
                      setWabaId('');
                      setAccessToken('');
                      setTokenEdited(true);
                    }}
                    className="w-full justify-center"
                  >
                    WAHA Custom
                  </Button>
                </div>
              </div>

              {provider === 'direct_waha' ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Zap className="size-4 text-primary animate-pulse" />
                    WhatsApp Direto (WAHA)
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Esta opção permite conectar sua conta do WhatsApp diretamente ao Unico Ex via QR Code, utilizando nosso servidor dedicado seguro. 
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nenhuma credencial ou servidor adicional é necessário. Basta clicar em <strong>Salvar Configuração</strong> abaixo e, em seguida, escanear o QR Code gerado no topo da página.
                  </p>
                </div>
              ) : provider === 'evolution' ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Nome da Instância (Instance Name)</Label>
                    <Input
                      placeholder="Ex: unico-ex"
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      O identificador exato da instância criada no Evolution API.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">URL da Evolution API</Label>
                    <Input
                      placeholder="Ex: https://api.evolution-api.com"
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      A URL base do servidor onde o Evolution API está rodando.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Chave da API (API Key)</Label>
                    <div className="relative">
                      <Input
                        type={showToken ? 'text' : 'password'}
                        placeholder="Insira a apikey da Evolution API"
                        value={accessToken}
                        onChange={(e) => {
                          setAccessToken(e.target.value);
                          setTokenEdited(true);
                        }}
                        onFocus={() => {
                          if (accessToken === MASKED_TOKEN) {
                            setAccessToken('');
                            setTokenEdited(true);
                          }
                        }}
                        className="bg-muted border-border text-foreground placeholder:text-muted-foreground pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {config && !tokenEdited && (
                      <p className="text-xs text-muted-foreground">
                        A chave de API está oculta por segurança. Reinsira-a para salvar alterações.
                      </p>
                    )}
                  </div>
                </>
              ) : provider === 'chatwoot' ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">ID da Conta Chatwoot (Account ID)</Label>
                    <Input
                      placeholder="Ex: 1"
                      value={cwAccountId}
                      onChange={(e) => setCwAccountId(e.target.value)}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      O ID numérico da sua conta no painel do Chatwoot.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">ID da Caixa de Entrada (Inbox ID)</Label>
                    <Input
                      placeholder="Ex: 5"
                      value={cwInboxId}
                      onChange={(e) => setCwInboxId(e.target.value)}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      O ID da caixa de entrada (inbox) configurada no Chatwoot.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">URL do Servidor Chatwoot</Label>
                    <Input
                      placeholder="Ex: https://app.chatwoot.com"
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      A URL base da sua instalação ou nuvem do Chatwoot.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Token de Acesso da API (API Access Token)</Label>
                    <div className="relative">
                      <Input
                        type={showToken ? 'text' : 'password'}
                        placeholder="Insira seu Token de Acesso da API do Chatwoot"
                        value={accessToken}
                        onChange={(e) => {
                          setAccessToken(e.target.value);
                          setTokenEdited(true);
                        }}
                        onFocus={() => {
                          if (accessToken === MASKED_TOKEN) {
                            setAccessToken('');
                            setTokenEdited(true);
                          }
                        }}
                        className="bg-muted border-border text-foreground placeholder:text-muted-foreground pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {config && !tokenEdited && (
                      <p className="text-xs text-muted-foreground">
                        O token de acesso está oculto por segurança. Reinsira-o para salvar alterações.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Nome da Sessão WAHA (Session Name)</Label>
                    <Input
                      placeholder="Ex: default"
                      value={wahaSessionName}
                      onChange={(e) => setWahaSessionName(e.target.value)}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      O nome da sessão criada no WAHA (ex: default).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">URL do Servidor WAHA</Label>
                    <Input
                      placeholder="Ex: https://area-51-waha.mypaeg.easypanel.host"
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      A URL base do servidor onde o WAHA está rodando.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Chave da API WAHA (API Key / Token)</Label>
                    <div className="relative">
                      <Input
                        type={showToken ? 'text' : 'password'}
                        placeholder="Insira a apikey configurada no WAHA"
                        value={accessToken}
                        onChange={(e) => {
                          setAccessToken(e.target.value);
                          setTokenEdited(true);
                        }}
                        onFocus={() => {
                          if (accessToken === MASKED_TOKEN) {
                            setAccessToken('');
                            setTokenEdited(true);
                          }
                        }}
                        className="bg-muted border-border text-foreground placeholder:text-muted-foreground pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {config && !tokenEdited && (
                      <p className="text-xs text-muted-foreground">
                        A chave de API está oculta por segurança. Reinsira-a para salvar alterações.
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label className="text-muted-foreground">Token de Verificação do Webhook (Opcional)</Label>
                <Input
                  placeholder="Insira um token customizado caso sua API exija"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  String de autenticação configurada nos cabeçalhos de webhook.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Configuração do Webhook */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Configuração do Webhook</CardTitle>
              <CardDescription className="text-muted-foreground">
                Copie a URL abaixo para cadastrar como Webhook no {provider === 'chatwoot' ? 'Chatwoot' : provider === 'waha' ? 'WAHA' : 'Evolution API'} para receber mensagens no chat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-muted-foreground">URL de Callback do Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="bg-muted border-border text-muted-foreground font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyWebhookUrl}
                    className="shrink-0 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !config}
              className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {testing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Zap className="size-4" />
                  Testar Conexão com API
                </>
              )}
            </Button>
            {config && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={resetting}
                className="border-red-900 text-red-400 hover:text-red-300 hover:bg-red-950/40"
              >
                {resetting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Limpando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="size-4" />
                    Limpar Conexão
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Guia de Configuração Lateral */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-base">Instruções de Configuração</CardTitle>
              <CardDescription className="text-muted-foreground">
                Siga estes passos para parear seu WhatsApp via Evolution API.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion>
                <AccordionItem value="item-1" className="border-border">
                  <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline">
                    <span className="flex items-center gap-2 text-left">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0">1</span>
                      Criar a Instância
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Abra o painel da sua Evolution API</li>
                      <li>Clique em Criar Instância</li>
                      <li>Escolha um nome amigável (ex: <code className="text-foreground text-xs">unico-ex</code>)</li>
                      <li>Selecione a conexão via Baileys/WhatsApp Web</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border-border">
                  <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline">
                    <span className="flex items-center gap-2 text-left">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0">2</span>
                      Escanear QR Code
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Clique em Gerar QR Code no painel da API</li>
                      <li>Abra o WhatsApp no seu aparelho</li>
                      <li>Vá em Configurações &gt; Aparelhos Conectados</li>
                      <li>Aponte para o QR Code gerado para conectar</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-border">
                  <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline">
                    <span className="flex items-center gap-2 text-left">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0">3</span>
                      Preencher Credenciais
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Copie o Nome da Instância no campo correspondente</li>
                      <li>Insira a URL base do Evolution (ex: <code className="text-foreground text-xs">https://api.evolution.com</code>)</li>
                      <li>Copie a <strong className="text-foreground">apikey</strong> gerada e cole no campo de Chave da API</li>
                      <li>Clique em Salvar Configuração</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border-border">
                  <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline">
                    <span className="flex items-center gap-2 text-left">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0">4</span>
                      Configurar Webhooks
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Vá em Webhooks na sua Evolution API</li>
                      <li>Clique em Configurar/Habilitar Webhook</li>
                      <li>Cole a URL de Callback fornecida nesta tela</li>
                      <li>Marque os eventos: <strong className="text-foreground">MESSAGES_UPSERT</strong> (mensagens recebidas) e <strong className="text-foreground">MESSAGES_UPDATE</strong> (status das mensagens)</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="mt-4 pt-4 border-t border-border">
                <a
                  href="https://doc.evolution-api.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  Documentação da Evolution API
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
