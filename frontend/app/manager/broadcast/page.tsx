"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Send, Loader2 } from "lucide-react"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api, ApiError } from "@/lib/api"

const schema = z.object({
  subject: z.string().min(3, "Тема — минимум 3 символа"),
  message: z.string().min(10, "Текст письма — минимум 10 символов"),
})
type FormData = z.infer<typeof schema>

interface BroadcastResult {
  sent: number
}

export default function BroadcastPage() {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { subject: "", message: "" },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await api.post<BroadcastResult>("/manager/broadcast", data)
      toast.success(`Отправлено: ${res.sent}`)
      form.reset({ subject: "", message: "" })
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : "Не удалось отправить рассылку"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <LayoutWithSidebar role="manager">
      <div className="space-y-6 max-w-2xl">
        {/* Header + мягкое аврора-свечение за заголовком */}
        <div className="relative space-y-1">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)",
            }}
          />
          <h1 className="relative text-2xl font-bold">Рассылка</h1>
          <p className="relative text-sm text-muted-foreground">
            Одно письмо всем клиентам — анонсы, изменения расписания, акции
          </p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Новое письмо</CardTitle>
            <CardDescription>Тема и текст уйдут на email каждого клиента</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тема</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: Изменение расписания отправок" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Текст письма</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Напишите текст рассылки..."
                        className="min-h-40 resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="space-y-2 pt-1">
                  <Button type="submit" disabled={loading} size="lg" className="btn-shine rounded-full px-6">
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Отправить всем клиентам
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Письмо уйдёт всем зарегистрированным клиентам
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  )
}
