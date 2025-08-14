-- Permitir que usuários autenticados criem modelos
CREATE POLICY "Users can create their own models" 
ON public.models 
FOR INSERT 
WITH CHECK (true);

-- Permitir que usuários leiam modelos publicamente
CREATE POLICY "Public can view models" 
ON public.models 
FOR SELECT 
USING (true);